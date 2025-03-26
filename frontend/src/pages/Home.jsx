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
  Upload,
  Save,
  Trash,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "react-bootstrap-icons";
import { ForceGraph2D } from "react-force-graph";
import "./Home.css";
import { AlertBox, GraphContainer } from "./Form.style.js";
import AnonymizationToggle from "../components/AnonymizationToggle.jsx";
import NetworkCustomizationToolbar from "../components/NetworkCustomizationToolbar.jsx";

const Home = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState("");
  const [uploadedFile, setUploadedFile] = useState("");
  const [chartData, setChartData] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [filter, setFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [messageLimit, setMessageLimit] = useState(50);
  const [keywords, setKeywords] = useState("");
  const [inputKey, setInputKey] = useState(Date.now());
  const [showFilters, setShowFilters] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showDensity, setShowDensity] = useState(false);
  const [densityValue, setDensityValue] = useState(0);
  const [showDiameter, setShowDiameter] = useState(false);
  const [diameterValue, setDiameterValue] = useState(0);
  const [showNetworkStats, setShowNetworkStats] = useState(false);
  const [networkStats, setNetworkStats] = useState({});
  const [minMessageLength, setMinMessageLength] = useState(10);
  const [maxMessageLength, setMaxMessageLength] = useState(100);
  const [usernameFilter, setUsernameFilter] = useState("");
  const [minMessages, setMinMessages] = useState("");
  const [maxMessages, setMaxMessages] = useState("");
  const [activeUsers, setActiveUsers] = useState("");
  const [selectedUsers, setSelectedUsers] = useState("");
  const [isAnonymized, setIsAnonymized] = useState(false);
  const [endTime, setEndTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [limitType, setLimitType] = useState("first");
  const [originalNetworkData, setOriginalNetworkData] = useState(null);
  const [strongConnectionsActive, setStrongConnectionsActive] = useState(false);
  const [comparisonCount, setComparisonCount] = useState(1);
  const [comparisonFiles, setComparisonFiles] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [activeComparisonIndices, setActiveComparisonIndices] = useState([]);
  const [comparisonNetworkData, setComparisonNetworkData] = useState([]);
  const [comparisonFilter, setComparisonFilter] = useState("");
  const [minComparisonWeight, setMinComparisonWeight] = useState(1);
  const [comparisonMetrics, setComparisonMetrics] = useState([]);
  const [highlightCommonNodes, setHighlightCommonNodes] = useState(false);
  const [filteredOriginalData, setFilteredOriginalData] = useState(null);
  const [filteredComparisonData, setFilteredComparisonData] = useState({});
  const [communities, setCommunities] = useState([]);
  const [customizedNetworkData, setCustomizedNetworkData] = useState(null);
  const [highlightCentralNodes, setHighlightCentralNodes] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeToRemove, setNodeToRemove] = useState(null);
  const [showRemoveNodeModal, setShowRemoveNodeModal] = useState(false);
  const [activityFilterEnabled, setActivityFilterEnabled] = useState(false);
  const [activityThreshold, setActivityThreshold] = useState(2); 
  const forceGraphRef = useRef(null);
  const [networkWasRestored, setNetworkWasRestored] = useState(false);
  const [shouldFetchCommunities, setShouldFetchCommunities] = useState(false);
  const [showOnlyIntraCommunityLinks, setShowOnlyIntraCommunityLinks] =
    useState(false);
    const [communityMap, setCommunityMap] = useState({});


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
      setFilter("");
      setStartDate("");
      setEndDate("");
      setMessageLimit(50);
      setKeywords("");
      setInputKey(Date.now());
      setComparisonNetworkData([]);
      setComparisonData([]);
      setComparisonFiles([]);
      setComparisonCount(1);
      setActiveComparisonIndices([]);
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

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
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
        setFilter("");
        setStartDate("");
        setEndDate("");
        setMessageLimit(50);
        setKeywords("");
        setInputKey(Date.now());
      } else {
        setMessage("Error: Could not delete the file.");
      }
    } catch (error) {
      setMessage("An error occurred during the delete operation.");
    }
  };



  const formatTime = (time) => {
    return time && time.length === 5 ? `${time}:00` : time;
  };

  const handleNetworkAnalysis = () => {
    if (!uploadedFile) {
      setMessage("No file selected for analysis.");
      return;
    }

    setNetworkWasRestored(false);

    const params = buildNetworkFilterParams();
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

  const calculateNodeDegree = (nodes, links) => {
    const degreeMap = {};
    nodes.forEach((node) => (degreeMap[node.id] = 0));
    links.forEach((link) => {
      degreeMap[link.source] += 1;
      degreeMap[link.target] += 1;
    });
    return nodes.map((node) => ({ ...node, degree: degreeMap[node.id] || 0 }));
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
  const toggleComparisonActive = (index) => {
    if (activeComparisonIndices.includes(index)) {
      setActiveComparisonIndices(
        activeComparisonIndices.filter((i) => i !== index)
      );
    } else {
      setActiveComparisonIndices([...activeComparisonIndices, index]);
    }

    setNetworkWasRestored(false);
  };
  const handleComparisonFileChange = (event, index) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const updatedFiles = [...comparisonFiles];
    updatedFiles[index] = selectedFile;
    setComparisonFiles(updatedFiles);

    const formData = new FormData();
    formData.append("file", selectedFile);

    fetch("http://localhost:8001/upload", {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.filename) {
          const updatedData = [...comparisonData];
          updatedData[index] = {
            id: index,
            filename: data.filename,
            name: selectedFile.name,
          };
          setComparisonData(updatedData);
          console.log(`Comparison file ${index} uploaded: ${data.filename}`);
        }
      })
      .catch(() => {
        console.error("Error uploading comparison file");
        setMessage("An error occurred during comparison file upload.");
      });
  };

  const handleComparisonAnalysis = (index) => {
    const comparisonFile = comparisonData[index];
    if (!comparisonFile || !comparisonFile.filename) {
      setMessage("Please select a comparison file first.");
      return;
    }

    const params = buildNetworkFilterParams();
    const url = `http://localhost:8001/analyze/network/${
      comparisonFile.filename
    }?${params.toString()}`;

    console.log(`Analyzing comparison file ${index}: ${url}`);
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        console.log(`Comparison data ${index} returned:`, data);
        if (data.nodes && data.links) {
          const updatedComparisonData = [...comparisonNetworkData];
          updatedComparisonData[index] = data;
          setComparisonNetworkData(updatedComparisonData);

          if (!activeComparisonIndices.includes(index)) {
            setActiveComparisonIndices([...activeComparisonIndices, index]);
          }

          setMessage(
            `Comparison analysis ${index + 1} completed successfully!`
          );
        } else {
          setMessage(`No valid data returned for comparison ${index + 1}.`);
        }
      })
      .catch((err) => {
        setMessage(`Error analyzing comparison file ${index + 1}.`);
        console.error(`Error during comparison analysis ${index}:`, err);
      });
  };

  const renderComparisonGraph = (index) => {
    const compData = comparisonNetworkData[index];
    if (!compData || !compData.nodes || !compData.links) {
      return <div>No data available for this comparison</div>;
    }

    const filteredNodes = compData.nodes.filter((node) =>
      node.id.toLowerCase().includes(filter.toLowerCase())
    );

    const filteredLinks = compData.links.filter(
      (link) =>
        filteredNodes.some(
          (node) =>
            node.id === link.source ||
            (typeof link.source === "object" && node.id === link.source.id)
        ) &&
        filteredNodes.some(
          (node) =>
            node.id === link.target ||
            (typeof link.target === "object" && node.id === link.target.id)
        )
    );
  };

  const calculateComparisonStats = (originalData, comparisonData) => {
    if (!originalData || !comparisonData) {
      return null;
    }

    const originalNodeCount = originalData.nodes.length;
    const comparisonNodeCount = comparisonData.nodes.length;
    const originalLinkCount = originalData.links.length;
    const comparisonLinkCount = comparisonData.links.length;

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
      comparisonData.nodes.map((node) => node.id)
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
  
  const fetchCommunityData = () => {
    if (!uploadedFile) {
      setMessage("No file selected for community detection.");
      return;
    }
  
    const params = buildNetworkFilterParams();
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
                console.log(`Assigning node ${node.id} to community ${community}`);
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
  
            setMessage(`Detected ${data.communities.length} communities in the network.`);
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
  
    const params = buildNetworkFilterParams();
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
                console.log(`Assigning node ${node.id} to community ${community}`);
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
  
            setMessage(`Detected ${data.communities.length} communities in the network.`);
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
  const toggleComparisonMetric = (metric) => {
    if (comparisonMetrics.includes(metric)) {
      setComparisonMetrics(comparisonMetrics.filter((m) => m !== metric));
    } else {
      setComparisonMetrics([...comparisonMetrics, metric]);
    }
  };

  const applyComparisonFilters = () => {
    if (
      !originalNetworkData ||
      activeComparisonIndices.length === 0 ||
      !uploadedFile
    ) {
      return;
    }
    const backupNetwork = { ...networkData };
    const params = buildNetworkFilterParams();

    params.append("original_filename", uploadedFile);

    const comparisonPromises = activeComparisonIndices.map((index) => {
      const comparisonParams = new URLSearchParams(params);
      comparisonParams.append(
        "comparison_filename",
        comparisonData[index].filename
      );
      comparisonParams.append("node_filter", comparisonFilter);
      comparisonParams.append("min_weight", minComparisonWeight);
      comparisonParams.append("highlight_common", highlightCommonNodes);

      if (comparisonMetrics.length > 0) {
        comparisonParams.append("metrics", comparisonMetrics.join(","));
      }
      return fetch(
        `http://localhost:8001/analyze/compare-networks?${comparisonParams.toString()}`
      ).then((response) => response.json());
    });
    setMessage("Processing network comparison...");

    Promise.all(comparisonPromises)
      .then((results) => {
        if (results.some((data) => data.error)) {
          const errors = results
            .filter((data) => data.error)
            .map((data) => data.error)
            .join(", ");
          setMessage(`Error in comparisons: ${errors}`);
          return;
        }
        setFilteredOriginalData(standardizeGraphData(results[0].original));

        const processedComparisons = {};
        activeComparisonIndices.forEach((index, arrayIndex) => {
          processedComparisons[index] = standardizeGraphData(
            results[arrayIndex].comparison
          );
        });
        setFilteredComparisonData(processedComparisons);

        setNetworkData(backupNetwork);

        setMessage(
          `${results.length} network comparisons completed successfully!`
        );
      })
      .catch((error) => {
        console.error("Error during network comparisons:", error);
        setMessage("An error occurred during network comparisons");
      });
  };
  const resetComparisonFilters = () => {
    setComparisonFilter("");
    setMinComparisonWeight(1);
    setComparisonMetrics([]);
    setHighlightCommonNodes(false);
    setFilteredOriginalData(null);
    setFilteredComparisonData({});
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
  const buildNetworkFilterParams = () => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (messageLimit) params.append("limit", messageLimit);
    if (minMessageLength) params.append("min_length", minMessageLength);
    if (maxMessageLength) params.append("max_length", maxMessageLength);
    if (keywords) params.append("keywords", keywords);
    if (usernameFilter) params.append("username", usernameFilter);
    if (minMessages) params.append("min_messages", minMessages);
    if (maxMessages) params.append("max_messages", maxMessages);
    if (activeUsers) params.append("active_users", activeUsers);
    if (selectedUsers) params.append("selected_users", selectedUsers);
    if (startTime) params.append("start_time", formatTime(startTime));
    if (endTime) params.append("end_time", formatTime(endTime));
    if (limitType) params.append("limit_type", limitType);
    params.append("anonymize", isAnonymized ? "true" : "false");

    return params;
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
        const sourceId = typeof link.source === "object" ? link.source.id : link.source;
        const targetId = typeof link.target === "object" ? link.target.id : link.target;
  
        const sourceCommunity = communityMap[sourceId?.toString().trim()];
        const targetCommunity = communityMap[targetId?.toString().trim()];
  
        if (sourceCommunity === undefined || targetCommunity === undefined) {
          return false;
        }
  
        return sourceCommunity === targetCommunity;
      });
  
      const connectedNodeIds = new Set();
      filteredLinks.forEach((link) => {
        const sourceId = typeof link.source === "object" ? link.source.id : link.source;
        const targetId = typeof link.target === "object" ? link.target.id : link.target;
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
        "#313659", "#5f6289", "#324b4a", "#158582", "#9092bc", "#c4c6f1",
        "#ff9800", "#4caf50", "#2196f3", "#e91e63", "#9c27b0", "#795548"
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
        `Showing only intra-community links and hiding isolated nodes. Removed ${networkData.links.length - filteredLinks.length} cross-community links.`
      );
    } else {
      const restoredNodes = originalNetworkData.nodes.map((node) => {
        const currentNode = networkData.nodes.find((n) => n.id === node.id);
        if (currentNode && currentNode.originalX !== undefined && currentNode.originalY !== undefined) {
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
  

  return (
    <Container fluid className="upload-section">
      {/* Research Upload */}
      <Card onSubmit={handleSubmit} className="research-card">
        <Form>
          <Row className="align-items-center justify-content-between">
            <Col>
              <h4 className="fw-bold">New Research</h4>
            </Col>
            <Col className="text-end">
              <Button className="action-btn me-2">
                <Save size={16} /> Save
              </Button>
              <Button onClick={handleDelete} className="action-btn delete-btn">
                <Trash size={16} /> Delete File
              </Button>
            </Col>
          </Row>
          <Row className="mt-3 align-items-center">
            <Col lg={8} md={12}>
              <Form.Group className="mb-3">
                <Form.Label className="research-label">
                  Research Name:
                </Form.Label>
                <Form.Control
                  type="text"
                  id="name"
                  value={name}
                  placeholder="Enter the name of your research"
                  onChange={(e) => setName(e.target.value)}
                  className="research-input"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="research-label">Description:</Form.Label>
                <Form.Control
                  type="text"
                  id="description"
                  value={description}
                  placeholder="Enter a short description"
                  onChange={(e) => setDescription(e.target.value)}
                  className="research-input"
                />
              </Form.Group>
              <div>
                <AnonymizationToggle
                  isAnonymized={isAnonymized}
                  setIsAnonymized={setIsAnonymized}
                />
              </div>
            </Col>
            <Col
              lg={4}
              md={12}
              className="d-flex flex-column align-items-center mt-3 mt-lg-0"
            >
              <Button className="upload-btn" onClick={handleUploadClick}>
                <Upload size={16} /> Upload File
              </Button>

              <Form.Control
                type="file"
                accept=".txt"
                ref={fileInputRef}
                onChange={handleFileChange}
                key={inputKey}
                style={{ display: "none" }}
              />
              {message && (
                <AlertBox success={message.includes("successfully").toString()}>
                  {message}
                </AlertBox>
              )}
            </Col>
          </Row>
        </Form>
      </Card>

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
            <Card className="research-card mt-3">
              <h4 className="fw-bold">Activity Threshold</h4>
              <p>Show users with at least this many connections:</p>
              <Form.Group>
                <div className="d-flex align-items-center">
                  <Form.Range
                    min={1}
                    max={10}
                    value={activityThreshold}
                    onChange={(e) => {
                      const newThreshold = parseInt(e.target.value, 10);
                      setActivityThreshold(newThreshold);
                      if (activityFilterEnabled && originalNetworkData) {
                        applyActivityFilter(newThreshold);
                      }
                    }}
                    className="flex-grow-1 me-2"
                  />
                  <div className="activity-value-display">
                    {activityThreshold}
                  </div>
                </div>
              </Form.Group>
            </Card>
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
                      {graphMetrics.map((metric) => (
                        <Button
                          key={metric}
                          className={`metrics-item ${
                            selectedMetric === metric ? "active" : ""
                          }`}
                          onClick={() => {
                            handleToggleMetric(metric);
                            if (metric === "Density") handleDensityMetric();
                            if (metric === "Diameter") handleDiameterMetric();
                          }}
                        >
                          {metric}
                        </Button>
                      ))}

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
              </Col>
            </Row>
          )}

          <Row className="mt-4">
            <Card className="comparison-card">
              <h4 className="fw-bold">Comparison Section</h4>
              <Row>
                <Col md={6}>
                  <Button
                    className="action-btn mt-3 mb-3"
                    onClick={() => setComparisonCount(comparisonCount + 1)}
                  >
                    {/* <Upload size={16} />  */}
                    Add New Comparison
                  </Button>
                </Col>
              </Row>
              {[...Array(comparisonCount)].map((_, index) => (
                <Card key={index} className="mb-3">
                  <Card.Body>
                    <Row className="align-items-center">
                      <Col md={4}>
                        <h5>Comparison File #{index + 1}</h5>
                        {comparisonData[index]?.filename ? (
                          <p>{comparisonData[index].name}</p>
                        ) : (
                          <p>No file selected</p>
                        )}
                      </Col>
                      <Col md={8} className="text-end">
                        <Button
                          className="action-btn me-2"
                          onClick={() =>
                            document.getElementById(`compFile${index}`).click()
                          }
                        >
                          <Upload size={16} /> Upload File
                        </Button>
                        <input
                          type="file"
                          id={`compFile${index}`}
                          style={{ display: "none" }}
                          accept=".txt"
                          onChange={(e) => handleComparisonFileChange(e, index)}
                        />
                        {comparisonData[index]?.filename && (
                          <Button
                            className="action-btn"
                            onClick={() => handleComparisonAnalysis(index)}
                          >
                            Analyze Network
                          </Button>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}

              <Row>
                {comparisonNetworkData.map((data, index) => {
                  if (data && data.nodes && data.links) {
                    return (
                      <Col md={12} key={index}>
                        <Card className="mt-3 mb-3">
                          <Card.Header
                            as="h5"
                            className="d-flex justify-content-between"
                          >
                            <span>
                              Comparison #{index + 1}:{" "}
                              {comparisonData[index]?.name || ""}
                            </span>
                            <Form.Check
                              type="checkbox"
                              label="Add to comparison view"
                              checked={activeComparisonIndices.includes(index)}
                              onChange={() => toggleComparisonActive(index)}
                              className="mt-1"
                            />
                          </Card.Header>
                          <Card.Body className="text-center">
                            {renderComparisonGraph(index)}
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  }
                  return null;
                })}
              </Row>

              {networkData && activeComparisonIndices.length > 0 && (
                <Row className="mt-4">
                  <h4 className="fw-bold">Network Comparison View</h4>
                  <div className="comparison-toolbar mb-3">
                    <div className="toolbar-section">
                      <span className="toolbar-label">Filter:</span>
                      <input
                        type="text"
                        className="toolbar-input"
                        placeholder="Filter nodes..."
                        value={comparisonFilter}
                        onChange={(e) => setComparisonFilter(e.target.value)}
                      />
                    </div>

                    <div className="toolbar-section">
                      <span className="toolbar-label">Min Weight:</span>
                      <input
                        type="number"
                        className="toolbar-input"
                        min="1"
                        value={minComparisonWeight}
                        onChange={(e) =>
                          setMinComparisonWeight(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>

                    <div className="toolbar-section metrics-toggles">
                      <span className="toolbar-label">Metrics:</span>
                      <div className="toolbar-buttons">
                        {graphMetrics.slice(0, 5).map((metric) => (
                          <button
                            key={metric}
                            className={`toolbar-button ${
                              comparisonMetrics.includes(metric) ? "active" : ""
                            }`}
                            onClick={() => toggleComparisonMetric(metric)}
                            title={metric}
                          >
                            {metric.split(" ")[0]}
                          </button>
                        ))}
                        <button
                          className={`toolbar-button ${
                            highlightCommonNodes ? "active" : ""
                          }`}
                          onClick={() =>
                            setHighlightCommonNodes(!highlightCommonNodes)
                          }
                          title="Highlight Common Nodes"
                        >
                          Common
                        </button>
                      </div>
                    </div>

                    <div className="toolbar-section">
                      <button
                        className="toolbar-action-btn"
                        onClick={applyComparisonFilters}
                      >
                        Apply
                      </button>
                      <button
                        className="toolbar-action-btn outline"
                        onClick={resetComparisonFilters}
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <Col
                    md={activeComparisonIndices.length > 1 ? 12 : 6}
                    className="mb-4"
                  >
                    <Card>
                      <Card.Header as="h5">Original Network</Card.Header>
                      <Card.Body className="text-center">
                        <GraphContainer>
                          {renderForceGraph(
                            filteredOriginalData || {
                              nodes: originalNetworkData
                                ? [...originalNetworkData.nodes]
                                : [...networkData.nodes],
                              links: originalNetworkData
                                ? [...originalNetworkData.links]
                                : [...networkData.links],
                            },
                            activeComparisonIndices.length > 1 ? 1000 : 600,
                            500,
                            false
                          )}
                        </GraphContainer>
                      </Card.Body>
                    </Card>
                  </Col>

                  {activeComparisonIndices.map((index) => (
                    <Col
                      md={activeComparisonIndices.length > 1 ? 6 : 6}
                      key={`comparison-${index}`}
                      className="mb-4"
                    >
                      <Card>
                        <Card.Header as="h5">
                          Comparison Network #{index + 1}
                        </Card.Header>
                        <Card.Body className="text-center">
                          <GraphContainer>
                            {renderForceGraph(
                              filteredComparisonData &&
                                filteredComparisonData[index]
                                ? filteredComparisonData[index]
                                : {
                                    nodes: [
                                      ...comparisonNetworkData[index].nodes,
                                    ],
                                    links: [
                                      ...comparisonNetworkData[index].links,
                                    ],
                                  },
                              activeComparisonIndices.length > 2 ? 600 : 600,
                              500,
                              true
                            )}
                          </GraphContainer>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Row>
          {networkData && activeComparisonIndices.length > 0 && (
            <Row className="mt-4 mb-4">
              <Card>
                <Card.Header>
                  <h5 className="fw-bold">Comparison Statistics</h5>
                </Card.Header>
                <Card.Body>
                  {activeComparisonIndices.map((index) => (
                    <div key={`stats-${index}`} className="mb-4">
                      <h6>
                        Statistics for Comparison #{index + 1}:{" "}
                        {comparisonData[index]?.name || ""}
                      </h6>
                      {(() => {
                        const compData = comparisonNetworkData[index];
                        const stats = calculateComparisonStats(
                          networkData,
                          compData
                        );

                        if (!stats)
                          return (
                            <p>Could not calculate comparison statistics.</p>
                          );

                        return (
                          <Table responsive striped bordered hover>
                            <thead>
                              <tr>
                                <th>Metric</th>
                                <th>Original Network</th>
                                <th>Comparison Network</th>
                                <th>Difference</th>
                                <th>Change %</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Node Count</td>
                                <td>{stats.originalNodeCount}</td>
                                <td>{stats.comparisonNodeCount}</td>
                                <td>
                                  {stats.nodeDifference > 0
                                    ? `+${stats.nodeDifference}`
                                    : stats.nodeDifference}
                                </td>
                                <td>{stats.nodeChangePercent}%</td>
                              </tr>
                              <tr>
                                <td>Edge Count</td>
                                <td>{stats.originalLinkCount}</td>
                                <td>{stats.comparisonLinkCount}</td>
                                <td>
                                  {stats.linkDifference > 0
                                    ? `+${stats.linkDifference}`
                                    : stats.linkDifference}
                                </td>
                                <td>{stats.linkChangePercent}%</td>
                              </tr>
                              <tr>
                                <td>Common Nodes</td>
                                <td colSpan="2">{stats.commonNodesCount}</td>
                                <td colSpan="2">
                                  {(
                                    (stats.commonNodesCount /
                                      stats.originalNodeCount) *
                                    100
                                  ).toFixed(2)}
                                  % of original network
                                </td>
                              </tr>
                            </tbody>
                          </Table>
                        );
                      })()}
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Row>
          )}
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
