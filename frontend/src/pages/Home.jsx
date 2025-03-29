import React, { useState, useRef, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Container,
  Row,
  Col,
  Form,
  Table,
  Button,
  Card,
} from "react-bootstrap";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileBarGraph,
} from "react-bootstrap-icons";
import { ForceGraph2D } from "react-force-graph";
import "./Home.css";
import { GraphContainer } from "./Form.style.js";
import NetworkCustomizationToolbar from "../components/NetworkCustomizationToolbar.jsx";
import ComparisonPanel from "../components/comparison/ComparisonPanel.jsx";
import ResearchCard from "../components/common/ResearchCard.jsx";
import MetricsButton from "../components/common/MetricsButton.jsx";
import ActivitySlider from "../components/common/ActivitySlider.jsx";
import NetworkDataTable from "../components/NetworkDataTable.jsx";
import useComparison from "../hooks/useComparison.jsx";
import useFilters from "../hooks/useFilters.jsx";

const Home = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState("");
  const [uploadedFile, setUploadedFile] = useState("");
  const [chartData, setChartData] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [inputKey, setInputKey] = useState(Date.now());
  const [showMetrics, setShowMetrics] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showDensity, setShowDensity] = useState(false);
  const [densityValue, setDensityValue] = useState(0);
  const [showDiameter, setShowDiameter] = useState(false);
  const [diameterValue, setDiameterValue] = useState(0);
  const [showNetworkStats, setShowNetworkStats] = useState(false);
  const [networkStats, setNetworkStats] = useState({});
  const [originalNetworkData, setOriginalNetworkData] = useState(null);
  const [strongConnectionsActive, setStrongConnectionsActive] = useState(false);
  const [communities, setCommunities] = useState([]);
  const [customizedNetworkData, setCustomizedNetworkData] = useState(null);
  const [highlightCentralNodes, setHighlightCentralNodes] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [showRemoveNodeModal, setShowRemoveNodeModal] = useState(false);
  const [activityFilterEnabled, setActivityFilterEnabled] = useState(false);
  const [activityThreshold, setActivityThreshold] = useState(2);
  const forceGraphRef = useRef(null);
  const [networkWasRestored, setNetworkWasRestored] = useState(false);
  const [shouldFetchCommunities, setShouldFetchCommunities] = useState(false);
  const [showOnlyIntraCommunityLinks, setShowOnlyIntraCommunityLinks] =
    useState(false);
  const [communityMap, setCommunityMap] = useState({});
  const {
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
  } = useComparison(originalNetworkData, uploadedFile);
  const filters = useFilters();
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    messageLimit,
    setMessageLimit,
    limitType,
    setLimitType,
    minMessageLength,
    setMinMessageLength,
    maxMessageLength,
    setMaxMessageLength,
    keywords,
    setKeywords,
    usernameFilter,
    setUsernameFilter,
    minMessages,
    setMinMessages,
    maxMessages,
    setMaxMessages,
    activeUsers,
    setActiveUsers,
    selectedUsers,
    setSelectedUsers,
    isAnonymized,
    setIsAnonymized,
    showFilters,
    setShowFilters,
    filter,
    setFilter,
    buildNetworkFilterParams,
    formatTime,
    resetFilters,
    handleInputChange,
  } = filters;
  const [visualizationSettings, setVisualizationSettings] = useState({
    colorBy: "default",
    sizeBy: "default",
    highlightUsers: [],
    highlightCommunities: [],
    communityNames: {},
    communityColors: {},
    customColors: {
      defaultNodeColor: "#050d2d",
      highlightNodeColor: "#00c6c2",
      communityColors: [
        "#313659",
        "#5f6289",
        "#324b4a",
        "#158582",
        "#9092bc",
        "#c4c6f1",
      ],
      edgeColor: "rgba(128, 128, 128, 0.6)",
    },
    nodeSizes: {
      min: 15,
      max: 40,
    },
    colorScheme: "default",
    showImportantNodes: false,
    importantNodesThreshold: 0.5,
  });

  const loadCommunityColors = (communities) => {
    if (!communities || communities.length === 0) {
      console.log("No communities to set colors for");
      return;
    }

    console.log("Setting up colors for", communities.length, "communities");

    const communityColors = {};
    const communityNames = {};

    communities.forEach((community, index) => {
      const communityId = community.id;
      const colorArray = visualizationSettings.customColors.communityColors;
      communityColors[communityId] = colorArray[index % colorArray.length];
      communityNames[communityId] = `Community ${communityId}`;
      console.log(
        `Community ${communityId} gets color ${communityColors[communityId]}`
      );
    });

    const updatedSettings = {
      ...visualizationSettings,
      communityColors: communityColors,
      communityNames: communityNames,
      colorBy: "community",
      highlightCommunities: [],
    };

    setVisualizationSettings(updatedSettings);
    console.log("Updated visualization settings:", updatedSettings);

    handleNetworkCustomization(updatedSettings);
  };
  const graphMetrics = [
    "Degree Centrality",
    "Betweenness Centrality",
    "Closeness Centrality",
    "Eigenvector Centrality",
    "PageRank Centrality",
    "Density",
    "Diameter",
  ];

  useEffect(() => {
    if (!uploadedFile) {
      setFile(null);
      setChartData(null);
      setNetworkData(null);
      filters.setFilter("");
      filters.setStartDate("");
      filters.setEndDate("");
      filters.setMessageLimit(50);
      filters.setKeywords("");
      setInputKey(Date.now());
      if (forceGraphRef.current) {
        forceGraphRef.current.zoomToFit(400, 100);
      }
    }
    if (networkData) {
      calculateNetworkStats();
    }
    if (
      shouldFetchCommunities &&
      networkData &&
      networkData.nodes?.length > 0
    ) {
      fetchCommunityData();
      setShouldFetchCommunities(false);
    }
  }, [shouldFetchCommunities, uploadedFile, showMetrics, networkData]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setUploadedFile("");
    setChartData(null);
    setNetworkData(null);
    setMessage("");
    handleSubmit(selectedFile);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = (selectedFile) => {
    if (!selectedFile) {
      setMessage("Please select a file before uploading.");
      return;
    }
    const formData = new FormData();
    formData.append("file", selectedFile);
    fetch("http://localhost:8001/upload", {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message) {
          setMessage(data.message);
          setUploadedFile(data.filename);
        }
      })
      .catch(() => setMessage("An error occurred during the upload."));
  };

  const handleDelete = async () => {
    if (!uploadedFile) {
      setMessage("No file selected to delete.");
      return;
    }
    try {
      const response = await fetch(
        `http://localhost:8001/delete/${uploadedFile}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (data.success) {
        setMessage(data.message || "File deleted successfully!");
        setUploadedFile("");
        setFile(null);
        setChartData(null);
        setNetworkData(null);
        filters.setFilter("");
        filters.setStartDate("");
        filters.setEndDate("");
        filters.setMessageLimit(50);
        filters.setKeywords("");
        setInputKey(Date.now());
      } else {
        setMessage("Error: Could not delete the file.");
      }
    } catch (error) {
      setMessage("An error occurred during the delete operation.");
    }
  };

  const handleNetworkAnalysis = () => {
    if (!uploadedFile) {
      setMessage("No file selected for analysis.");
      return;
    }

    setNetworkWasRestored(false);

    const params = filters.buildNetworkFilterParams();
    const url = `http://localhost:8001/analyze/network/${uploadedFile}?${params.toString()}`;

    console.log("Request URL:", url);
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        console.log("Data returned from server:", data);
        if (data.nodes && data.links) {
          setNetworkData(data);
          setOriginalNetworkData(data);
          setShouldFetchCommunities(true);
        } else {
          setMessage("No data returned from server.");
        }
      })
      .catch((err) => {
        setMessage("An error occurred during network analysis.");
        console.error("Error during network analysis:", err);
      });
  };

  const handleSaveToDB = () => {
    if (!name || !description) {
      setMessage("Please fill in all required fields.");
      return;
    }
    const formData = {
      name,
      description,
      start_date: startDate,
      end_date: endDate,
      message_limit: messageLimit,
    };
    fetch("http://localhost:8001/save-form", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message) {
          setMessage(data.message);
        }
      })
      .catch(() => setMessage("An error occurred while saving the form."));
  };

  const calculateNetworkStats = () => {
    if (!networkData) return;

    const { nodes, links } = networkData;
    const numNodes = nodes.length;
    const numEdges = links.length;
    const inDegreeMap = {};
    const outDegreeMap = {};
    let reciprocalEdges = 0;

    links.forEach((link) => {
      inDegreeMap[link.target] = (inDegreeMap[link.target] || 0) + 1;
      outDegreeMap[link.source] = (outDegreeMap[link.source] || 0) + 1;

      if (
        links.some((l) => l.source === link.target && l.target === link.source)
      ) {
        reciprocalEdges++;
      }
    });

    const reciprocity =
      numEdges > 0 ? (reciprocalEdges / numEdges).toFixed(2) : 0;

    setNetworkStats({
      numNodes,
      numEdges,
      reciprocity,
      inDegreeMap,
      outDegreeMap,
    });
  };

  const handleToggleMetric = (metric) => {
    setSelectedMetric(selectedMetric === metric ? null : metric);
  };

  const handleDensityMetric = () => {
    const density = calculateDensity(networkData.nodes, networkData.links);
    setDensityValue(density.toFixed(4));
    setShowDensity(!showDensity);
  };

  const calculateDensity = (nodes, links) => {
    const n = nodes.length;
    const m = links.length;
    if (n < 2) return 0;
    return (2 * m) / (n * (n - 1));
  };

  const calculateDiameter = (nodes, links) => {
    if (nodes.length < 2) return 0;

    const distances = {};
    nodes.forEach((node) => {
      distances[node.id] = {};
      nodes.forEach(
        (n) => (distances[node.id][n.id] = node.id === n.id ? 0 : Infinity)
      );
    });

    links.forEach((link) => {
      distances[link.source][link.target] = 1;
      distances[link.target][link.source] = 1;
    });

    // Floyd-Warshall
    nodes.forEach((k) => {
      nodes.forEach((i) => {
        nodes.forEach((j) => {
          if (
            distances[i.id][j.id] >
            distances[i.id][k.id] + distances[k.id][j.id]
          ) {
            distances[i.id][j.id] =
              distances[i.id][k.id] + distances[k.id][j.id];
          }
        });
      });
    });

    let maxDistance = 0;
    nodes.forEach((i) => {
      nodes.forEach((j) => {
        if (distances[i.id][j.id] !== Infinity) {
          maxDistance = Math.max(maxDistance, distances[i.id][j.id]);
        }
      });
    });

    return maxDistance;
  };

  const handleDiameterMetric = () => {
    setShowDiameter(!showDiameter);
    if (!showDiameter && networkData) {
      const diameter = calculateDiameter(networkData.nodes, networkData.links);
      setDiameterValue(diameter);
    }
  };

  const filteredNodes = networkData
    ? networkData.nodes.filter((node) =>
        node.id.toLowerCase().includes(filter.toLowerCase())
      )
    : [];
  const filteredLinks = networkData
    ? networkData.links.filter(
        (link) =>
          filteredNodes.some((node) => node.id === link.source) &&
          filteredNodes.some((node) => node.id === link.target)
      )
    : [];

  const handleStrongConnections = () => {
    if (!networkData) return;

    if (strongConnectionsActive) {
      setNetworkData(originalNetworkData);
      setStrongConnectionsActive(false);

      setNetworkWasRestored(false);
    } else {
      const threshold = 0.2;
      const filteredNodes = networkData.nodes.filter(
        (node) => node.betweenness >= threshold
      );
      const filteredLinks = networkData.links.filter(
        (link) =>
          filteredNodes.some((node) => node.id === link.source) &&
          filteredNodes.some((node) => node.id === link.target)
      );

      setNetworkData({ nodes: filteredNodes, links: filteredLinks });
      setStrongConnectionsActive(true);
    }
  };

  const fetchCommunityData = () => {
    if (!uploadedFile) {
      setMessage("No file selected for community detection.");
      return;
    }

    const params = filters.buildNetworkFilterParams();
    params.append("algorithm", "louvain");

    const url = `http://localhost:8001/analyze/communities/${uploadedFile}?${params.toString()}`;

    console.log("Community detection URL:", url);
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        console.log("Community data returned from server:", data);

        if (data.communities && data.nodes) {
          setCommunities(data.communities);

          const newCommunityMap = {};

          data.nodes.forEach((node) => {
            if (node.community !== undefined) {
              newCommunityMap[node.id.toString().trim()] = node.community;
            }
          });

          console.log("CommunityMap:", newCommunityMap);
          setCommunityMap(newCommunityMap);

          if (networkData && networkData.nodes) {
            const updatedNodes = networkData.nodes.map((node) => {
              const normalizedId = node.id.toString().trim();
              const community = newCommunityMap[normalizedId];

              if (community !== undefined) {
                console.log(
                  `Assigning node ${node.id} to community ${community}`
                );
                return { ...node, community };
              }

              return node;
            });

            setNetworkData({
              nodes: updatedNodes,
              links: networkData.links,
            });

            setOriginalNetworkData({
              nodes: updatedNodes,
              links: networkData.links,
            });

            setMessage(
              `Detected ${data.communities.length} communities in the network.`
            );
          }
        } else {
          setMessage("No community data returned from server.");
        }
      })
      .catch((err) => {
        setMessage("An error occurred during community detection.");
        console.error("Error during community detection:", err);
      });
  };

  const detectAndApplyCommunityData = () => {
    if (!uploadedFile) {
      setMessage("No file selected for community detection.");
      return;
    }

    const params = filters.buildNetworkFilterParams();
    params.append("algorithm", "louvain");

    const url = `http://localhost:8001/analyze/communities/${uploadedFile}?${params.toString()}`;

    console.log("Community detection URL:", url);
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        console.log("Community data returned from server:", data);

        if (data.communities && data.nodes) {
          setCommunities(data.communities);

          const newCommunityMap = {};

          data.nodes.forEach((node) => {
            if (node.community !== undefined) {
              newCommunityMap[node.id.toString().trim()] = node.community;
            }
          });

          console.log("CommunityMap:", newCommunityMap);
          setCommunityMap(newCommunityMap);

          if (networkData && networkData.nodes) {
            const updatedNodes = networkData.nodes.map((node) => {
              const normalizedId = node.id.toString().trim();
              const community = newCommunityMap[normalizedId];

              if (community !== undefined) {
                console.log(
                  `Assigning node ${node.id} to community ${community}`
                );
                return { ...node, community };
              }

              return node;
            });

            setNetworkData({
              nodes: updatedNodes,
              links: networkData.links,
            });

            setOriginalNetworkData({
              nodes: updatedNodes,
              links: networkData.links,
            });

            setMessage(
              `Detected ${data.communities.length} communities in the network.`
            );
          }
        } else {
          setMessage("No community data returned from server.");
        }
      })
      .catch((err) => {
        setMessage("An error occurred during community detection.");
        console.error("Error during community detection:", err);
      });
  };

  const handleNetworkCustomization = (settings) => {
    setVisualizationSettings(settings);
    console.log("Applying visualization settings:", settings);

    if (!networkData) return;

    const customizedNodes = JSON.parse(JSON.stringify(networkData.nodes));
    const customizedLinks = JSON.parse(JSON.stringify(networkData.links));

    for (const node of customizedNodes) {
      let nodeSize = settings.nodeSizes.min;
      let nodeColor = settings.customColors.defaultNodeColor;

      const sizeByValue = (metric) => {
        const maxVal = Math.max(...customizedNodes.map((n) => n[metric] || 0));
        const ratio = maxVal > 0 ? (node[metric] || 0) / maxVal : 0;
        return (
          settings.nodeSizes.min +
          ratio * (settings.nodeSizes.max - settings.nodeSizes.min)
        );
      };

      if (settings.sizeBy === "messages") nodeSize = sizeByValue("messages");
      else if (settings.sizeBy === "degree") nodeSize = sizeByValue("degree");
      else if (settings.sizeBy === "betweenness")
        nodeSize = sizeByValue("betweenness");
      else if (settings.sizeBy === "pagerank")
        nodeSize = sizeByValue("pagerank");

      if (settings.colorBy === "community" && node.community !== undefined) {
        const communityId = parseInt(node.community, 10);
        nodeColor =
          settings.communityColors?.[communityId] ??
          settings.customColors.communityColors[
            communityId % settings.customColors.communityColors.length
          ];
      } else if (settings.colorBy === "degree") {
        const maxDegree = Math.max(
          ...customizedNodes.map((n) => n.degree || 0)
        );
        const ratio = maxDegree > 0 ? (node.degree || 0) / maxDegree : 0;
        nodeColor = interpolateColor(
          "#ffefca",
          settings.customColors.defaultNodeColor,
          ratio
        );
      } else if (settings.colorBy === "betweenness") {
        const maxBtw = Math.max(
          ...customizedNodes.map((n) => n.betweenness || 0)
        );
        const ratio = maxBtw > 0 ? (node.betweenness || 0) / maxBtw : 0;
        nodeColor = interpolateColor("#ffefca", "#FF5733", ratio);
      } else if (settings.colorBy === "pagerank") {
        const maxPR = Math.max(...customizedNodes.map((n) => n.pagerank || 0));
        const ratio = maxPR > 0 ? (node.pagerank || 0) / maxPR : 0;
        nodeColor = interpolateColor("#ffefca", "#3366CC", ratio);
      } else if (
        settings.colorBy === "custom" &&
        settings.highlightUsers.includes(node.id)
      ) {
        nodeColor = settings.customColors.highlightNodeColor;
      }

      if (
        settings.highlightCommunities?.includes(parseInt(node.community, 10))
      ) {
        node.isHighlightedCommunity = true;
      } else {
        node.isHighlightedCommunity = false;
      }

      if (settings.showImportantNodes) {
        const threshold = settings.importantNodesThreshold || 0.5;
        const maxBetweenness = Math.max(
          ...customizedNodes.map((n) => n.betweenness || 0)
        );
        const maxPageRank = Math.max(
          ...customizedNodes.map((n) => n.pagerank || 0)
        );
        const isImportant =
          node.betweenness / maxBetweenness > threshold ||
          node.pagerank / maxPageRank > threshold;

        if (isImportant) {
          nodeColor = settings.customColors.highlightNodeColor;
          nodeSize = Math.max(nodeSize, settings.nodeSizes.max * 0.8);
        }
      }

      node.size = nodeSize;
      node.color = nodeColor;
    }

    setCustomizedNetworkData({
      nodes: customizedNodes,
      links: customizedLinks,
    });
  };

  const interpolateColor = (color1, color2, ratio) => {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
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

  const renderForceGraph = (
    graphData,
    width,
    height,
    isComparisonGraph = false
  ) => {
    if (!graphData || !graphData.nodes || !graphData.links) {
      return <div>No data available</div>;
    }

    const processedData = {
      nodes: [...graphData.nodes],
      links: graphData.links.map((link) => {
        const sourceId =
          typeof link.source === "object" ? link.source.id : link.source;
        const targetId =
          typeof link.target === "object" ? link.target.id : link.target;

        const sourceNode = graphData.nodes.find((n) => n.id === sourceId);
        const targetNode = graphData.nodes.find((n) => n.id === targetId);

        return {
          source: sourceNode || sourceId,
          target: targetNode || targetId,
          weight: link.weight || 1,
        };
      }),
    };

    const baseColor = isComparisonGraph ? "purple" : "blue";
    const linkColor = isComparisonGraph
      ? "rgba(128, 0, 128, 0.6)"
      : "rgba(128, 128, 128, 0.6)";

    const getNodeSize = (node) => {
      if (!node) return 20;

      if (filteredOriginalData && filteredComparisonData) {
        if (comparisonMetrics.includes("Degree Centrality"))
          return Math.max(10, node.degree * 80);
        if (comparisonMetrics.includes("Betweenness Centrality"))
          return Math.max(10, node.betweenness * 80);
        if (comparisonMetrics.includes("Closeness Centrality"))
          return Math.max(10, node.closeness * 50);
        if (comparisonMetrics.includes("Eigenvector Centrality"))
          return Math.max(10, node.eigenvector * 60);
        if (comparisonMetrics.includes("PageRank Centrality"))
          return Math.max(10, node.pagerank * 500);
      } else if (!isComparisonGraph && selectedMetric) {
        if (selectedMetric === "Degree Centrality")
          return Math.max(10, node.degree * 80);
        if (selectedMetric === "Betweenness Centrality")
          return Math.max(10, node.betweenness * 80);
        if (selectedMetric === "Closeness Centrality")
          return Math.max(10, node.closeness * 50);
        if (selectedMetric === "Eigenvector Centrality")
          return Math.max(10, node.eigenvector * 60);
        if (selectedMetric === "PageRank Centrality")
          return Math.max(10, node.pagerank * 500);
      }

      return 20;
    };
    return (
      <ForceGraph2D
        graphData={processedData}
        width={width}
        height={height}
        fitView
        fitViewPadding={20}
        nodeAutoColorBy="id"
        linkWidth={(link) => Math.sqrt(link.weight || 1)}
        linkColor={() => linkColor}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const fontSize = 12 / globalScale;

          const radius =
            node.size ||
            (selectedMetric === "PageRank Centrality"
              ? Math.max(10, node.pagerank * 500)
              : selectedMetric === "Eigenvector Centrality"
              ? Math.max(10, node.eigenvector * 60)
              : selectedMetric === "Closeness Centrality"
              ? Math.max(10, node.closeness * 50)
              : selectedMetric === "Betweenness Centrality"
              ? Math.max(10, node.betweenness * 80)
              : selectedMetric === "Degree Centrality"
              ? Math.max(10, node.degree * 80)
              : 20);

          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);

          const isCommunityHighlighted =
            node.community !== undefined &&
            visualizationSettings.highlightCommunities &&
            visualizationSettings.highlightCommunities.includes(
              parseInt(node.community, 10)
            );

          const isNodeHighlighted = node.highlighted && highlightCentralNodes;

          let nodeColor;

          if (node.color) {
            nodeColor = node.color;
          } else if (selectedMetric === "PageRank Centrality") {
            nodeColor = "orange";
          } else if (selectedMetric === "Eigenvector Centrality") {
            nodeColor = "purple";
          } else if (selectedMetric === "Closeness Centrality") {
            nodeColor = "green";
          } else if (selectedMetric === "Betweenness Centrality") {
            nodeColor = "red";
          } else if (selectedMetric === "Degree Centrality") {
            nodeColor = "#231d81";
          } else {
            nodeColor = "blue";
          }
          if (node.isHighlightedCommunity && node.community !== undefined) {
            const communityName =
              visualizationSettings.communityNames?.[node.community] ||
              `Community ${node.community}`;
            ctx.fillStyle = "#F5BD20";
            ctx.font = `${fontSize * 0.8}px Sans-Serif`;
            ctx.fillText(communityName, node.x, node.y + radius + 15);
          }
          ctx.fillStyle = nodeColor;
          ctx.fill();

          if (isCommunityHighlighted) {
            ctx.strokeStyle =
              visualizationSettings.customColors.highlightNodeColor;
            ctx.lineWidth = 3;
            ctx.stroke();

            console.log(
              `Rendering highlighted community node: ${node.id}, community: ${node.community}, color: ${nodeColor}`
            );
          } else if (isNodeHighlighted) {
            ctx.strokeStyle = "#ffff00";
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "white";
          ctx.fillText(node.id, node.x, node.y);

          if (selectedMetric === "Degree Centrality") {
            ctx.fillStyle = "#231d81";
            ctx.fillText(`Deg: ${node.degree}`, node.x, node.y + radius + 5);
          }
          if (selectedMetric === "Betweenness Centrality") {
            ctx.fillStyle = "DarkRed";
            ctx.fillText(
              `Btw: ${node.betweenness?.toFixed(2) || 0}`,
              node.x,
              node.y + radius + 5
            );
          }
          if (selectedMetric === "Closeness Centrality") {
            ctx.fillStyle = "green";
            ctx.fillText(
              `Cls: ${node.closeness?.toFixed(2) || 0}`,
              node.x,
              node.y + radius + 5
            );
          }
          if (selectedMetric === "Eigenvector Centrality") {
            ctx.fillStyle = "purple";
            ctx.fillText(
              `Eig: ${node.eigenvector?.toFixed(4) || 0}`,
              node.x,
              node.y + radius + 5
            );
          }
          if (selectedMetric === "PageRank Centrality") {
            ctx.fillStyle = "orange";
            ctx.fillText(
              `PR: ${node.pagerank?.toFixed(4) || 0}`,
              node.x,
              node.y + radius + 5
            );
          }
          ctx.restore();
        }}
      />
    );
  };

  const handleHighlightCentralNodes = () => {
    if (!networkData) return;

    setHighlightCentralNodes(!highlightCentralNodes);

    setNetworkWasRestored(false);

    if (!highlightCentralNodes) {
      let centralityMeasure = "degree";
      if (selectedMetric === "Betweenness Centrality")
        centralityMeasure = "betweenness";
      else if (selectedMetric === "Closeness Centrality")
        centralityMeasure = "closeness";
      else if (selectedMetric === "Eigenvector Centrality")
        centralityMeasure = "eigenvector";
      else if (selectedMetric === "PageRank Centrality")
        centralityMeasure = "pagerank";

      setNetworkWasRestored(false);

      const updatedNodes = networkData.nodes.map((node) => {
        const centralityValue = node[centralityMeasure] || 0;
        const sortedNodes = [...networkData.nodes].sort(
          (a, b) => (b[centralityMeasure] || 0) - (a[centralityMeasure] || 0)
        );

        const thresholdIndex = Math.floor(sortedNodes.length * 0.2);
        const threshold =
          thresholdIndex >= 0 && thresholdIndex < sortedNodes.length
            ? sortedNodes[thresholdIndex][centralityMeasure] || 0
            : 0;

        return {
          ...node,
          highlighted: centralityValue >= threshold,
        };
      });

      setNetworkData({
        ...networkData,
        nodes: updatedNodes,
      });
    } else {
      const resetNodes = networkData.nodes.map((node) => ({
        ...node,
        highlighted: false,
      }));

      setNetworkData({
        ...networkData,
        nodes: resetNodes,
      });
    }
  };

  const handleNodeClick = (node) => {
    if (networkWasRestored) {
      setSelectedNode(node);
      setShowRemoveNodeModal(true);
    }
  };

  const handleRemoveNode = () => {
    if (!selectedNode || !networkData) return;

    const updatedNodes = networkData.nodes.filter(
      (node) => node.id !== selectedNode.id
    );

    const updatedLinks = networkData.links.filter(
      (link) =>
        link.source !== selectedNode.id &&
        link.target !== selectedNode.id &&
        link.source.id !== selectedNode.id &&
        link.target.id !== selectedNode.id
    );

    if (!originalNetworkData) {
      setOriginalNetworkData(JSON.parse(JSON.stringify(networkData)));
    }

    setNetworkData({
      nodes: updatedNodes,
      links: updatedLinks,
    });

    setShowRemoveNodeModal(false);
    setSelectedNode(null);
  };

  const handleRestoreNetwork = () => {
    if (originalNetworkData) {
      if (networkWasRestored) {
        setNetworkWasRestored(false);
      } else {
        setNetworkData(JSON.parse(JSON.stringify(originalNetworkData)));
        setNetworkWasRestored(true);

        if (activityFilterEnabled) {
          setActivityFilterEnabled(false);
        }
      }
    }
  };

  const handleActivityFilter = () => {
    if (!networkData) return;

    const newState = !activityFilterEnabled;
    setActivityFilterEnabled(newState);

    if (newState) {
      if (!originalNetworkData) {
        setOriginalNetworkData(JSON.parse(JSON.stringify(networkData)));
        setNetworkWasRestored(false);
      }

      const connectionCounts = {};
      networkData.nodes.forEach((node) => {
        connectionCounts[node.id] = 0;
      });

      networkData.links.forEach((link) => {
        const sourceId =
          typeof link.source === "object" ? link.source.id : link.source;
        const targetId =
          typeof link.target === "object" ? link.target.id : link.target;

        connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
        connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
      });

      const activeNodes = networkData.nodes.filter(
        (node) => connectionCounts[node.id] >= activityThreshold
      );

      const activeLinks = networkData.links.filter((link) => {
        const sourceId =
          typeof link.source === "object" ? link.source.id : link.source;
        const targetId =
          typeof link.target === "object" ? link.target.id : link.target;

        return (
          activeNodes.some((node) => node.id === sourceId) &&
          activeNodes.some((node) => node.id === targetId)
        );
      });

      setNetworkData({
        nodes: activeNodes,
        links: activeLinks,
      });
    } else {
      if (originalNetworkData) {
        setNetworkData(JSON.parse(JSON.stringify(originalNetworkData)));
        setNetworkWasRestored(true);
      }
    }
  };

  const applyActivityFilter = (threshold) => {
    if (!networkData) return;
    if (!originalNetworkData && !activityFilterEnabled) {
      setOriginalNetworkData(JSON.parse(JSON.stringify(networkData)));
    }
    const connectionCounts = {};
    networkData.nodes.forEach((node) => {
      connectionCounts[node.id] = 0;
    });

    networkData.links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;

      connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
      connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
    });

    const activeNodes = networkData.nodes.filter(
      (node) => connectionCounts[node.id] >= threshold
    );

    const activeLinks = networkData.links.filter((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;

      return (
        activeNodes.some((node) => node.id === sourceId) &&
        activeNodes.some((node) => node.id === targetId)
      );
    });

    setNetworkData({
      nodes: activeNodes,
      links: activeLinks,
    });
  };

  const handleToggleCommunitiesFilter = () => {
    if (!networkData || !originalNetworkData) return;

    if (!communityMap || Object.keys(communityMap).length === 0) {
      setMessage("Community data not found. Detecting communities...");
      detectAndApplyCommunityData();
      return;
    }

    const newState = !showOnlyIntraCommunityLinks;
    setShowOnlyIntraCommunityLinks(newState);

    if (newState) {
      const filteredLinks = networkData.links.filter((link) => {
        const sourceId =
          typeof link.source === "object" ? link.source.id : link.source;
        const targetId =
          typeof link.target === "object" ? link.target.id : link.target;

        const sourceCommunity = communityMap[sourceId?.toString().trim()];
        const targetCommunity = communityMap[targetId?.toString().trim()];

        if (sourceCommunity === undefined || targetCommunity === undefined) {
          return false;
        }

        return sourceCommunity === targetCommunity;
      });

      const connectedNodeIds = new Set();
      filteredLinks.forEach((link) => {
        const sourceId =
          typeof link.source === "object" ? link.source.id : link.source;
        const targetId =
          typeof link.target === "object" ? link.target.id : link.target;
        connectedNodeIds.add(sourceId);
        connectedNodeIds.add(targetId);
      });

      const communities = [...new Set(Object.values(communityMap))];
      const radius = 500;
      const angleStep = (2 * Math.PI) / communities.length;

      const communityCenters = {};
      communities.forEach((community, index) => {
        const angle = index * angleStep;
        communityCenters[community] = {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        };
      });

      const communityColors = [
        "#313659",
        "#5f6289",
        "#324b4a",
        "#158582",
        "#9092bc",
        "#c4c6f1",
        "#ff9800",
        "#4caf50",
        "#2196f3",
        "#e91e63",
        "#9c27b0",
        "#795548",
      ];

      const updatedNodes = networkData.nodes
        .filter((node) => connectedNodeIds.has(node.id))
        .map((node) => {
          const community = communityMap[node.id?.toString().trim()];
          const center = communityCenters[community];
          const jitter = 30;

          return {
            ...node,
            community,
            originalX: node.x,
            originalY: node.y,
            x: center.x + (Math.random() * jitter * 2 - jitter),
            y: center.y + (Math.random() * jitter * 2 - jitter),
            color: communityColors[Number(community) % communityColors.length],
          };
        });

      console.log("Updated nodes:", updatedNodes);
      console.log("Filtered links:", filteredLinks);

      setNetworkData({
        nodes: updatedNodes,
        links: filteredLinks,
      });

      setMessage(
        `Showing only intra-community links and hiding isolated nodes. Removed ${
          networkData.links.length - filteredLinks.length
        } cross-community links.`
      );
    } else {
      const restoredNodes = originalNetworkData.nodes.map((node) => {
        const currentNode = networkData.nodes.find((n) => n.id === node.id);
        if (
          currentNode &&
          currentNode.originalX !== undefined &&
          currentNode.originalY !== undefined
        ) {
          return {
            ...node,
            x: currentNode.originalX,
            y: currentNode.originalY,
          };
        }
        return node;
      });

      setNetworkData({
        nodes: restoredNodes,
        links: originalNetworkData.links,
      });

      setMessage("Showing all links in the network.");
    }

    if (forceGraphRef.current) {
      setTimeout(() => {
        forceGraphRef.current.d3ReheatSimulation();
        forceGraphRef.current.zoomToFit(400);
      }, 100);
    }
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

  return (
    <Container fluid className="upload-section">
      {/* Research Upload */}
      <ResearchCard
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        isAnonymized={isAnonymized}
        setIsAnonymized={setIsAnonymized}
        handleUploadClick={handleUploadClick}
        handleDelete={handleDelete}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        inputKey={inputKey}
        message={message}
      />

      {uploadedFile && (
        <div>
          <Card className="research-card">
            <h4 className="fw-bold d-flex justify-content-between align-items-center">
              Research Filters
              <Button
                variant="link"
                className="toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </Button>
            </h4>
            {showFilters && (
              <div>
                <Row className="mt-3">
                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        From Date:
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        To Date:
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        Start Time:
                      </Form.Label>
                      <Form.Control
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        End Time:
                      </Form.Label>
                      <Form.Control
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>

                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        Message Limit:
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        max="100"
                        value={messageLimit}
                        onChange={handleInputChange(setMessageLimit)}
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        Last/First Limit:
                      </Form.Label>
                      <select
                        value={limitType}
                        onChange={(e) => setLimitType(e.target.value)}
                        className="research-input"
                      >
                        <option value="first">First Messages</option>
                        <option value="last">Last Messages</option>
                        <option value="all">All Messages</option>
                      </select>
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mt-3">
                  <Row className="mt-3">
                    <Col lg={6} md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="research-label">
                          Min Message Length (Characters):
                        </Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          max="1000"
                          value={minMessageLength}
                          onChange={handleInputChange(setMinMessageLength)}
                          className="research-input"
                        />
                      </Form.Group>
                    </Col>
                    <Col lg={6} md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="research-label">
                          Max Message Length (Characters):
                        </Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          max="1000"
                          value={maxMessageLength}
                          onChange={handleInputChange(setMaxMessageLength)}
                          className="research-input"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        Keywords:
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={keywords}
                        onChange={handleInputChange(setKeywords)}
                        placeholder="Enter keywords, separated by commas"
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        Filter by Username:
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={usernameFilter}
                        onChange={(e) => setUsernameFilter(e.target.value)}
                        placeholder="Enter username"
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        Min Messages:
                      </Form.Label>
                      <Form.Control
                        type="number"
                        value={minMessages}
                        onChange={(e) => setMinMessages(e.target.value)}
                        placeholder="Enter min messages"
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        Max Messages:
                      </Form.Label>
                      <Form.Control
                        type="number"
                        value={maxMessages}
                        onChange={(e) => setMaxMessages(e.target.value)}
                        placeholder="Enter max messages"
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={4} md={4} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        Top Active Users:
                      </Form.Label>
                      <Form.Control
                        type="number"
                        value={activeUsers}
                        onChange={(e) => setActiveUsers(e.target.value)}
                        placeholder="Number of top active users"
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={12} className="mb-3">
                    <Form.Group>
                      <Form.Label className="research-label">
                        Specific Users:
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={selectedUsers}
                        onChange={(e) => setSelectedUsers(e.target.value)}
                        placeholder="Enter usernames, separated by commas"
                        className="research-input"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="align-items-center justify-content-between">
                  <Col>
                    <Button
                      onClick={handleNetworkAnalysis}
                      className="filter-btn"
                    >
                      Apply Filters
                    </Button>
                  </Col>
                </Row>
              </div>
            )}
          </Card>
          {activityFilterEnabled && (
            <ActivitySlider
              activityThreshold={activityThreshold}
              setActivityThreshold={setActivityThreshold}
              applyActivityFilter={applyActivityFilter}
            />
          )}

          {uploadedFile && (
            <Row className="mt-4">
              <Col
                lg={3}
                md={12}
                className={`mb-3 metrics-panel ${
                  showMetrics ? "open" : "closed"
                }`}
              >
                <Card className="metrics-card">
                  <h4 className="fw-bold d-flex justify-content-between align-items-center">
                    {showMetrics && "Graph Metrics"}
                    <Button
                      variant="link"
                      className="metrics-toggle"
                      onClick={() => setShowMetrics(!showMetrics)}
                    >
                      {showMetrics ? (
                        <ChevronLeft size={20} />
                      ) : (
                        <ChevronRight size={20} />
                      )}
                    </Button>
                  </h4>
                  {showMetrics && (
                    <div className="mt-2">
                      <MetricsButton
                        graphMetrics={graphMetrics}
                        selectedMetric={selectedMetric}
                        onToggleMetric={handleToggleMetric}
                        onDensity={handleDensityMetric}
                        onDiameter={handleDiameterMetric}
                      />
                      <Button
                        className="metrics-item"
                        onClick={() => setShowDataTable(!showDataTable)}
                        variant={showDataTable ? "primary" : "outline-primary"}
                      >
                        <FileBarGraph className="me-1" /> Explore Data Table
                      </Button>

                      <Button
                        className={`metrics-item ${
                          strongConnectionsActive ? "active" : ""
                        }`}
                        onClick={handleStrongConnections}
                      >
                        {strongConnectionsActive
                          ? "Show All Connections"
                          : "Strongest Connections"}
                      </Button>
                      <Button
                        className={`metrics-item ${
                          highlightCentralNodes ? "active" : ""
                        }`}
                        onClick={handleHighlightCentralNodes}
                      >
                        Highlight Central Nodes
                      </Button>
                      <Button
                        className={`metrics-item ${
                          networkWasRestored ? "active" : ""
                        }`}
                        onClick={handleRestoreNetwork}
                      >
                        Restore Original Network
                      </Button>
                      <Button
                        className={`metrics-item ${
                          activityFilterEnabled === true ? "active" : ""
                        }`}
                        onClick={handleActivityFilter}
                      >
                        {activityFilterEnabled
                          ? "Show All Users"
                          : "Hide Inactive Users"}
                      </Button>

                      <Button
                        className={`metrics-item ${
                          showOnlyIntraCommunityLinks ? "active" : ""
                        }`}
                        onClick={handleToggleCommunitiesFilter}
                      >
                        {showOnlyIntraCommunityLinks
                          ? "Show All Links"
                          : "Hide Cross-Community Links"}
                      </Button>
                    </div>
                  )}
                </Card>
                <Card className="metrics-card my-2">
                  <h4 className="fw-bold d-flex justify-content-between align-items-center">
                    Network Metrics
                    <Button
                      variant="link"
                      className="metrics-toggle"
                      onClick={() => setShowNetworkStats(!showNetworkStats)}
                    >
                      {showNetworkStats ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </Button>
                  </h4>
                  {showNetworkStats && (
                    <div className="mt-2">
                      <p>
                        <strong>Nodes:</strong> {networkStats.numNodes}
                      </p>
                      <p>
                        <strong>Edges:</strong> {networkStats.numEdges}
                      </p>
                      <p>
                        <strong>Reciprocity:</strong> {networkStats.reciprocity}
                      </p>

                      <h5 className="fw-bold mt-3">Top Nodes by Degree</h5>
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>Node ID</th>
                            <th>In-Degree</th>
                            <th>Out-Degree</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(networkStats.inDegreeMap || {})
                            .slice(0, 10)
                            .map((nodeId) => (
                              <tr key={nodeId}>
                                <td>{nodeId}</td>
                                <td>{networkStats.inDegreeMap[nodeId] || 0}</td>
                                <td>
                                  {networkStats.outDegreeMap[nodeId] || 0}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card>
              </Col>

              {/* Graph Display */}
              <Col lg={9} md={12} className="graph-area">
                {networkData && (
                  <NetworkCustomizationToolbar
                    networkData={networkData}
                    communities={communities}
                    onApplyCustomization={handleNetworkCustomization}
                    initialSettings={visualizationSettings}
                  />
                )}
                {(showDensity || showDiameter) && (
                  <Card className="density-card">
                    {showDensity && (
                      <h5 className="fw-bold">Graph Density: {densityValue}</h5>
                    )}
                    {showDiameter && (
                      <h5 className="fw-bold">
                        Graph Diameter: {diameterValue}
                      </h5>
                    )}
                  </Card>
                )}

                <Card className="graph-card">
                  <div className="graph-placeholder">
                    {networkData && (
                      <GraphContainer>
                        <ForceGraph2D
                          key={
                            showDensity || showDiameter || customizedNetworkData
                              ? "customized"
                              : "default"
                          }
                          graphData={{
                            nodes: customizedNetworkData
                              ? customizedNetworkData.nodes
                              : filteredNodes,
                            links: customizedNetworkData
                              ? customizedNetworkData.links.map((link) => {
                                  const sourceNode =
                                    customizedNetworkData.nodes.find(
                                      (node) =>
                                        (typeof link.source === "object" &&
                                          node.id === link.source.id) ||
                                        node.id === link.source
                                    );

                                  const targetNode =
                                    customizedNetworkData.nodes.find(
                                      (node) =>
                                        (typeof link.target === "object" &&
                                          node.id === link.target.id) ||
                                        node.id === link.target
                                    );

                                  return {
                                    source: sourceNode || link.source,
                                    target: targetNode || link.target,
                                    weight: link.weight || 1,
                                  };
                                })
                              : filteredLinks.map((link) => {
                                  const sourceNode = filteredNodes.find(
                                    (node) =>
                                      (typeof link.source === "object" &&
                                        node.id === link.source.id) ||
                                      node.id === link.source
                                  );

                                  const targetNode = filteredNodes.find(
                                    (node) =>
                                      (typeof link.target === "object" &&
                                        node.id === link.target.id) ||
                                      node.id === link.target
                                  );

                                  return {
                                    source: sourceNode || link.source,
                                    target: targetNode || link.target,
                                    weight: link.weight || 1,
                                  };
                                }),
                          }}
                          width={showMetrics ? 1200 : 1500}
                          height={500}
                          fitView
                          fitViewPadding={20}
                          nodeAutoColorBy={customizedNetworkData ? null : "id"}
                          linkWidth={(link) => Math.sqrt(link.weight || 1)}
                          linkColor={() => "gray"}
                          enableNodeDrag={true}
                          cooldownTicks={100}
                          d3AlphaDecay={0.03}
                          d3VelocityDecay={0.2}
                          onNodeClick={handleNodeClick}
                          onEngineStop={() =>
                            forceGraphRef.current?.zoomToFit(400, 100)
                          }
                          linkCanvasObject={(link, ctx, globalScale) => {
                            if (!link.source || !link.target) return;
                            ctx.beginPath();
                            ctx.moveTo(link.source.x, link.source.y);
                            ctx.lineTo(link.target.x, link.target.y);
                            ctx.strokeStyle = "gray";
                            ctx.lineWidth = Math.sqrt(link.weight || 1);
                            ctx.stroke();
                            const midX = (link.source.x + link.target.x) / 2;
                            const midY = (link.source.y + link.target.y) / 2;
                            const fontSize = 10 / globalScale;
                            ctx.save();
                            ctx.font = `${fontSize}px Sans-Serif`;
                            ctx.fillStyle = "black";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText(link.weight || "1", midX, midY);
                            ctx.restore();
                          }}
                          nodeCanvasObject={(node, ctx, globalScale) => {
                            const fontSize = 12 / globalScale;

                            const radius =
                              node.size ||
                              (selectedMetric === "PageRank Centrality"
                                ? Math.max(10, node.pagerank * 500)
                                : selectedMetric === "Eigenvector Centrality"
                                ? Math.max(10, node.eigenvector * 60)
                                : selectedMetric === "Closeness Centrality"
                                ? Math.max(10, node.closeness * 50)
                                : selectedMetric === "Betweenness Centrality"
                                ? Math.max(10, node.betweenness * 80)
                                : selectedMetric === "Degree Centrality"
                                ? Math.max(10, node.degree * 80)
                                : 20);

                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(
                              node.x,
                              node.y,
                              radius,
                              0,
                              2 * Math.PI,
                              false
                            );

                            const isHighlighted =
                              node.highlighted && highlightCentralNodes;

                            const nodeColor = isHighlighted
                              ? "#ff9900"
                              : node.color ||
                                (selectedMetric === "PageRank Centrality"
                                  ? "orange"
                                  : selectedMetric === "Eigenvector Centrality"
                                  ? "purple"
                                  : selectedMetric === "Closeness Centrality"
                                  ? "green"
                                  : selectedMetric === "Betweenness Centrality"
                                  ? "red"
                                  : selectedMetric === "Degree Centrality"
                                  ? "#231d81"
                                  : "blue");

                            ctx.fillStyle = nodeColor;
                            ctx.fill();

                            if (node.isHighlightedCommunity) {
                              ctx.save();
                              ctx.shadowColor = "#F5BD20";
                              ctx.shadowBlur = 15;
                              ctx.shadowOffsetX = 0;
                              ctx.shadowOffsetY = 0;
                              ctx.strokeStyle = "#F5BD20";
                              ctx.lineWidth = 2;
                              ctx.stroke();
                              ctx.restore();
                            } else if (isHighlighted) {
                              ctx.strokeStyle = "#ffff00";
                              ctx.lineWidth = 3;
                              ctx.stroke();
                            }

                            ctx.font = `${fontSize}px Sans-Serif`;
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillStyle = "white";
                            ctx.fillText(node.id, node.x, node.y);

                            if (selectedMetric === "Degree Centrality") {
                              ctx.fillStyle = "#231d81";
                              ctx.fillText(
                                `Deg: ${node.degree}`,
                                node.x,
                                node.y + radius + 5
                              );
                            }
                            if (selectedMetric === "Betweenness Centrality") {
                              ctx.fillStyle = "DarkRed";
                              ctx.fillText(
                                `Btw: ${node.betweenness?.toFixed(2) || 0}`,
                                node.x,
                                node.y + radius + 5
                              );
                            }
                            if (selectedMetric === "Closeness Centrality") {
                              ctx.fillStyle = "green";
                              ctx.fillText(
                                `Cls: ${node.closeness?.toFixed(2) || 0}`,
                                node.x,
                                node.y + radius + 5
                              );
                            }
                            if (selectedMetric === "Eigenvector Centrality") {
                              ctx.fillStyle = "purple";
                              ctx.fillText(
                                `Eig: ${node.eigenvector?.toFixed(4) || 0}`,
                                node.x,
                                node.y + radius + 5
                              );
                            }
                            if (selectedMetric === "PageRank Centrality") {
                              ctx.fillStyle = "orange";
                              ctx.fillText(
                                `PR: ${node.pagerank?.toFixed(4) || 0}`,
                                node.x,
                                node.y + radius + 5
                              );
                            }

                            ctx.restore();
                          }}
                          onNodeHover={(node) => {
                            if (node && networkWasRestored) {
                              document.body.style.cursor = "pointer";
                            } else {
                              document.body.style.cursor = "default";
                            }
                          }}
                        />
                      </GraphContainer>
                    )}
                  </div>
                </Card>
                {showDataTable && networkData && (
                  <NetworkDataTable
                    networkData={networkData}
                    onClose={() => setShowDataTable(false)}
                  />
                )}
              </Col>
            </Row>
          )}

          <Row className="mt-4">
            {uploadedFile && (
              <ComparisonPanel
                originalNetworkData={originalNetworkData}
                comparisonFiles={comparisonFiles}
                comparisonData={comparisonData}
                comparisonNetworkData={comparisonNetworkData}
                activeComparisonIndices={activeComparisonIndices}
                filteredOriginalData={filteredOriginalData}
                filteredComparisonData={filteredComparisonData}
                onFileUpload={handleComparisonFileChange}
                onAnalyzeNetwork={(index) => {
                  analyzeComparisonNetwork(
                    index,
                    buildNetworkFilterParams()
                  ).then((result) => {
                    if (result.message) {
                      setMessage(result.message);
                    }
                  });
                }}
                onToggleComparison={toggleComparisonActive}
                onApplyComparisonFilters={(filters) => {
                  const filtersWithNetworkParams = {
                    ...filters,
                    networkFilterParams: buildNetworkFilterParams(),
                  };

                  applyComparisonFilters(filtersWithNetworkParams).then(
                    (result) => {
                      if (result.message) {
                        setMessage(result.message);
                      }
                    }
                  );
                }}
                onResetComparisonFilters={resetComparisonFilters}
                addComparison={addComparison}
                comparisonCount={comparisonCount}
              />
            )}
          </Row>
        </div>
      )}
      {/* Node Removal Modal */}
      {showRemoveNodeModal && selectedNode && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Remove Node from Network</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRemoveNodeModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to remove the node{" "}
                  <strong>"{selectedNode.id}"</strong> from the network?
                </p>
                <p>
                  This will help analyze the impact of this user on the network
                  structure.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRemoveNodeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRemoveNode}
                >
                  Remove Node
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};
export default Home;
