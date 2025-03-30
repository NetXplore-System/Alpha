import { useState, useEffect } from "react";

const useComparison = (originalNetworkData, uploadedFile) => {
  const [comparisonCount, setComparisonCount] = useState(1);
  const [comparisonFiles, setComparisonFiles] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [activeComparisonIndices, setActiveComparisonIndices] = useState([]);
  const [comparisonNetworkData, setComparisonNetworkData] = useState([]);
  const [filteredOriginalData, setFilteredOriginalData] = useState(null);
  const [filteredComparisonData, setFilteredComparisonData] = useState({});
  const [comparisonFilter, setComparisonFilter] = useState("");
  const [minComparisonWeight, setMinComparisonWeight] = useState(1);
  const [comparisonMetrics, setComparisonMetrics] = useState([]);
  const [highlightCommonNodes, setHighlightCommonNodes] = useState(false);

  useEffect(() => {
    if (!uploadedFile) {
      setComparisonNetworkData([]);
      setComparisonData([]);
      setComparisonFiles([]);
      setComparisonCount(1);
      setActiveComparisonIndices([]);
      setFilteredOriginalData(null);
      setFilteredComparisonData({});
    }
  }, [uploadedFile]);

  const addComparison = () => {
    setComparisonCount((prevCount) => prevCount + 1);
  };

  const handleComparisonFileChange = async (event, index) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const updatedFiles = [...comparisonFiles];
    updatedFiles[index] = selectedFile;
    setComparisonFiles(updatedFiles);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://localhost:8001/upload", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const data = await response.json();

      if (data.filename) {
        const updatedData = [...comparisonData];
        updatedData[index] = {
          id: index,
          filename: data.filename,
          name: selectedFile.name,
        };
        setComparisonData(updatedData);
        console.log(`Comparison file ${index} uploaded: ${data.filename}`);
        return {
          success: true,
          message: `File "${selectedFile.name}" uploaded successfully`,
        };
      }
    } catch (error) {
      console.error("Error uploading comparison file:", error);
      return {
        success: false,
        message: "An error occurred during comparison file upload.",
      };
    }
  };

  const toggleComparisonActive = (index) => {
    setActiveComparisonIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const analyzeComparisonNetwork = async (index, filterParams) => {
    const comparisonFile = comparisonData[index];
    if (!comparisonFile || !comparisonFile.filename) {
      return {
        success: false,
        message: "Please select a comparison file first.",
      };
    }

    const url = `http://localhost:8001/analyze/network/${
      comparisonFile.filename
    }?${filterParams.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.nodes && data.links) {
        const updatedComparisonData = [...comparisonNetworkData];
        updatedComparisonData[index] = data;
        setComparisonNetworkData(updatedComparisonData);

        if (!activeComparisonIndices.includes(index)) {
          setActiveComparisonIndices((prev) => [...prev, index]);
        }

        return {
          success: true,
          message: `Comparison analysis ${index + 1} completed successfully!`,
        };
      } else {
        return {
          success: false,
          message: `No valid data returned for comparison ${index + 1}.`,
        };
      }
    } catch (error) {
      console.error(`Error during comparison analysis ${index}:`, error);
      return {
        success: false,
        message: `Error analyzing comparison file ${index + 1}.`,
      };
    }
  };

  const standardizeGraphData = (graphData) => {
    if (!graphData || !graphData.nodes || !graphData.links) {
      return graphData;
    }

    const nodeMap = {};
    graphData.nodes.forEach((node) => {
      nodeMap[node.id] = node;
    });

    const standardizedLinks = graphData.links.map((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;

      if (!nodeMap[sourceId] || !nodeMap[targetId]) {
        console.warn(`Invalid link: source=${sourceId}, target=${targetId}`);
      }

      return {
        source: sourceId,
        target: targetId,
        weight: link.weight || 1,
      };
    });

    return {
      nodes: graphData.nodes,
      links: standardizedLinks,
    };
  };

  const ensureMetricsData = (graphData, metrics) => {
    if (!graphData || !graphData.nodes || !graphData.links) {
      return;
    }

    if (
      metrics.includes("Degree Centrality") &&
      !graphData.nodes.some((node) => node.hasOwnProperty("degree"))
    ) {
      const degreeMap = {};
      graphData.nodes.forEach((node) => (degreeMap[node.id] = 0));

      graphData.links.forEach((link) => {
        const sourceId =
          typeof link.source === "object" ? link.source.id : link.source;
        const targetId =
          typeof link.target === "object" ? link.target.id : link.target;

        degreeMap[sourceId] = (degreeMap[sourceId] || 0) + 1;
        degreeMap[targetId] = (degreeMap[targetId] || 0) + 1;
      });

      graphData.nodes.forEach((node) => {
        node.degree = degreeMap[node.id] || 0;
      });
    }
  };

  const applyComparisonFilters = async (filters) => {
    if (
      !originalNetworkData ||
      activeComparisonIndices.length === 0 ||
      !uploadedFile
    ) {
      return { success: false, message: "No data available for comparison." };
    }

    setComparisonFilter(filters.comparisonFilter);
    setMinComparisonWeight(filters.minComparisonWeight);
    setComparisonMetrics(filters.comparisonMetrics);
    setHighlightCommonNodes(filters.highlightCommonNodes);

    const params = new URLSearchParams();

    if (filters.comparisonFilter)
      params.append("node_filter", filters.comparisonFilter);
    if (filters.minComparisonWeight)
      params.append("min_weight", filters.minComparisonWeight);
    params.append("highlight_common", filters.highlightCommonNodes.toString());
    params.append("original_filename", uploadedFile);

    if (filters.networkFilterParams) {
      for (const [key, value] of filters.networkFilterParams.entries()) {
        if (!params.has(key)) {
          params.append(key, value);
        }
      }
    }

    if (filters.comparisonMetrics && filters.comparisonMetrics.length > 0) {
      params.append("metrics", filters.comparisonMetrics.join(","));
    }

    try {
      const comparisonPromises = activeComparisonIndices.map((index) => {
        const comparisonParams = new URLSearchParams(params);
        comparisonParams.append(
          "comparison_filename",
          comparisonData[index].filename
        );

        return fetch(
          `http://localhost:8001/analyze/compare-networks?${comparisonParams.toString()}`
        ).then((response) => response.json());
      });

      const results = await Promise.all(comparisonPromises);

      if (results.some((data) => data.error)) {
        const errors = results
          .filter((data) => data.error)
          .map((data) => data.error)
          .join(", ");
        return { success: false, message: `Error in comparisons: ${errors}` };
      }

      const processedOriginal = standardizeGraphData(results[0].original);

      if (filters.comparisonMetrics && filters.comparisonMetrics.length > 0) {
        ensureMetricsData(processedOriginal, filters.comparisonMetrics);
      }

      setFilteredOriginalData(processedOriginal);

      const processedComparisons = {};
      activeComparisonIndices.forEach((index, arrayIndex) => {
        const processedComparison = standardizeGraphData(
          results[arrayIndex].comparison
        );

        if (filters.comparisonMetrics && filters.comparisonMetrics.length > 0) {
          ensureMetricsData(processedComparison, filters.comparisonMetrics);
        }

        processedComparisons[index] = processedComparison;
      });

      setFilteredComparisonData(processedComparisons);

      return {
        success: true,
        message: `${results.length} network comparisons completed successfully!`,
      };
    } catch (error) {
      console.error("Error during network comparisons:", error);
      return {
        success: false,
        message: "An error occurred during network comparisons",
      };
    }
  };

  const resetComparisonFilters = () => {
    setFilteredOriginalData(null);
    setFilteredComparisonData({});
    setComparisonFilter("");
    setMinComparisonWeight(1);
    setComparisonMetrics([]);
    setHighlightCommonNodes(false);
  };

  const calculateComparisonStats = (originalData, comparisonNetworkItem) => {
    if (!originalData || !comparisonNetworkItem) {
      return null;
    }

    const originalNodeCount = originalData.nodes.length;
    const comparisonNodeCount = comparisonNetworkItem.nodes.length;
    const originalLinkCount = originalData.links.length;
    const comparisonLinkCount = comparisonNetworkItem.links.length;

    const nodeDifference = comparisonNodeCount - originalNodeCount;
    const linkDifference = comparisonLinkCount - originalLinkCount;

    const nodeChangePercent = originalNodeCount
      ? (
          ((comparisonNodeCount - originalNodeCount) / originalNodeCount) *
          100
        ).toFixed(2)
      : 0;
    const linkChangePercent = originalLinkCount
      ? (
          ((comparisonLinkCount - originalLinkCount) / originalLinkCount) *
          100
        ).toFixed(2)
      : 0;

    const originalNodeIds = new Set(originalData.nodes.map((node) => node.id));
    const comparisonNodeIds = new Set(
      comparisonNetworkItem.nodes.map((node) => node.id)
    );

    const commonNodes = [...originalNodeIds].filter((id) =>
      comparisonNodeIds.has(id)
    );
    const commonNodesCount = commonNodes.length;

    return {
      originalNodeCount,
      comparisonNodeCount,
      originalLinkCount,
      comparisonLinkCount,
      nodeDifference,
      linkDifference,
      nodeChangePercent,
      linkChangePercent,
      commonNodesCount,
    };
  };

  return {
    comparisonCount,
    comparisonFiles,
    comparisonData,
    activeComparisonIndices,
    comparisonNetworkData,
    filteredOriginalData,
    filteredComparisonData,
    comparisonFilter,
    minComparisonWeight,
    comparisonMetrics,
    highlightCommonNodes,
    addComparison,
    handleComparisonFileChange,
    toggleComparisonActive,
    analyzeComparisonNetwork,
    applyComparisonFilters,
    resetComparisonFilters,
    calculateComparisonStats,
  };
};

export default useComparison;
