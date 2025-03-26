import React, { useState, useEffect } from "react";
import {
  Form,
  Card,
  Row,
  Col,
  Button,
  Table,
  InputGroup,
} from "react-bootstrap";
import {
  Palette,
  CircleFill,
  PeopleFill,
  PersonBadge,
  PencilSquare,
  CheckSquare,
  XSquare,
} from "react-bootstrap-icons";
import "./NetworkCustomizationToolbar.css";

const NetworkCustomizationToolbar = ({
  networkData,
  communities = [],
  onApplyCustomization,
  initialSettings = {},
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [colorBy, setColorBy] = useState(initialSettings.colorBy || "default");
  const [sizeBy, setSizeBy] = useState(initialSettings.sizeBy || "default");
  const [highlightUsers, setHighlightUsers] = useState(
    initialSettings.highlightUsers || []
  );
  const [highlightCommunities, setHighlightCommunities] = useState(
    initialSettings.highlightCommunities || []
  );
  const [customColors, setCustomColors] = useState(
    initialSettings.customColors || {
      defaultNodeColor: "#050d2d",
      highlightNodeColor: "#FF5733",
      communityColors: [
        "#FF5733",
        "#33FF57",
        "#3357FF",
        "#F3FF33",
        "#FF33F3",
        "#33FFF3",
      ],
      edgeColor: "rgba(128, 128, 128, 0.6)",
    }
  );
  const [nodeSizes, setNodeSizes] = useState(
    initialSettings.nodeSizes || {
      min: 15,
      max: 40,
    }
  );
  const [colorScheme, setColorScheme] = useState(
    initialSettings.colorScheme || "default"
  );
  const [communityColors, setCommunityColors] = useState({});
  const [showImportantNodes, setShowImportantNodes] = useState(
    initialSettings.showImportantNodes || false
  );
  const [importantNodesThreshold, setImportantNodesThreshold] = useState(
    initialSettings.importantNodesThreshold || 0.5
  );
  const [communityNames, setCommunityNames] = useState({});
  const [editingCommunityId, setEditingCommunityId] = useState(null);
  const [tempCommunityName, setTempCommunityName] = useState("");

  const nodeOptions =
    networkData?.nodes?.map((node) => ({
      id: node.id,
      messages: node.messages || 0,
      degree: node.degree || 0,
      betweenness: node.betweenness || 0,
      pagerank: node.pagerank || 0,
      community: node.community,
    })) || [];

  const sortedByDegree = [...nodeOptions].sort((a, b) => b.degree - a.degree);
  const sortedByBetweenness = [...nodeOptions].sort(
    (a, b) => b.betweenness - a.betweenness
  );
  const sortedByPageRank = [...nodeOptions].sort(
    (a, b) => b.pagerank - a.pagerank
  );

  const colorSchemes = {
    default: ["#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", "#0099C6"],
    pastel: ["#FFB6C1", "#AFEEEE", "#FFFACD", "#98FB98", "#D8BFD8", "#DDA0DD"],
    vivid: ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"],
    monochrome: [
      "#000000",
      "#333333",
      "#666666",
      "#999999",
      "#CCCCCC",
      "#FFFFFF",
    ],
    colorful: [
      "#E41A1C",
      "#377EB8",
      "#4DAF4A",
      "#984EA3",
      "#FF7F00",
      "#FFFF33",
    ],
    sequential: [
      "#FEF0D9",
      "#FDD49E",
      "#FDBB84",
      "#FC8D59",
      "#E34A33",
      "#B30000",
    ],
  };

  useEffect(() => {
    if (communities && communities.length) {
      const colors = {};
      const names = {};
      const scheme = colorSchemes[colorScheme] || colorSchemes.default;

      communities.forEach((community, index) => {
        colors[community.id] = scheme[index % scheme.length];
        names[community.id] =
          initialSettings.communityNames?.[community.id] ||
          `Community ${community.id}`;
      });

      setCommunityColors(colors);
      setCommunityNames(names);
    }
  }, [communities, colorScheme, initialSettings.communityNames]);

  const handleColorSchemeChange = (scheme) => {
    setColorScheme(scheme);

    if (communities && communities.length) {
      const colors = {};
      const schemeColors = colorSchemes[scheme] || colorSchemes.default;

      communities.forEach((community, index) => {
        colors[community.id] = schemeColors[index % schemeColors.length];
      });

      setCommunityColors(colors);
    }
  };

  const handleToggleUser = (userId) => {
    if (highlightUsers.includes(userId)) {
      setHighlightUsers(highlightUsers.filter((id) => id !== userId));
    } else {
      setHighlightUsers([...highlightUsers, userId]);
    }
  };

  const handleApplyCommunityColors = () => {
    const updatedSettings = {
      colorBy,
      sizeBy,
      highlightUsers,
      highlightCommunities,
      customColors,
      nodeSizes,
      colorScheme,
      communityColors,
      communityNames,
      showImportantNodes,
      importantNodesThreshold,
    };

    console.log("Applying community colors:", communityColors);
    onApplyCustomization(updatedSettings);
  };

  const handleToggleCommunity = (communityId) => {
    const id =
      typeof communityId === "string" ? parseInt(communityId, 10) : communityId;

    const newHighlightCommunities = highlightCommunities.includes(id)
      ? highlightCommunities.filter((cid) => cid !== id)
      : [...highlightCommunities, id];

    setHighlightCommunities(newHighlightCommunities);
    setColorBy("community");

    const updatedSettings = {
      colorBy: "community",
      sizeBy,
      highlightUsers,
      highlightCommunities: newHighlightCommunities,
      customColors,
      nodeSizes,
      colorScheme,
      communityColors,
      communityNames,
      showImportantNodes,
      importantNodesThreshold,
    };

    console.log(
      "Applying updated settings (with colorBy: 'community'):",
      updatedSettings
    );
    onApplyCustomization(updatedSettings);
  };

  const handleCommunityColorChange = (communityId, color) => {
    console.log(`Changing color for community ${communityId} to ${color}`);

    const updatedCommunityColors = {
      ...communityColors,
      [communityId]: color,
    };

    setCommunityColors(updatedCommunityColors);

    const updatedSettings = {
      colorBy,
      sizeBy,
      highlightUsers,
      highlightCommunities,
      customColors,
      nodeSizes,
      colorScheme,
      communityColors: updatedCommunityColors,
      communityNames,
      showImportantNodes,
      importantNodesThreshold,
    };

    console.log("Applying color change immediately:", updatedSettings);
    onApplyCustomization(updatedSettings);
  };

  const handleEditCommunityName = (communityId) => {
    setEditingCommunityId(communityId);
    setTempCommunityName(
      communityNames[communityId] || `Community ${communityId}`
    );
  };

  const handleSaveCommunityName = (communityId) => {
    if (tempCommunityName.trim()) {
      const updatedCommunityNames = {
        ...communityNames,
        [communityId]: tempCommunityName.trim(),
      };

      setCommunityNames(updatedCommunityNames);

      const updatedSettings = {
        ...initialSettings,
        communityNames: updatedCommunityNames,
      };

      onApplyCustomization(updatedSettings);
    }

    setEditingCommunityId(null);
    setTempCommunityName("");
  };

  const handleCancelEditName = () => {
    setEditingCommunityId(null);
    setTempCommunityName("");
  };

  const handleNodeSizeChange = (type, value) => {
    setNodeSizes({
      ...nodeSizes,
      [type]: parseInt(value),
    });
  };

  const handleColorChange = (colorType, value) => {
    setCustomColors({
      ...customColors,
      [colorType]: value,
    });
  };

  const handleApplyCustomization = () => {
    const settings = {
      colorBy,
      sizeBy,
      highlightUsers,
      highlightCommunities,
      customColors,
      nodeSizes,
      colorScheme,
      communityColors,
      communityNames,
      showImportantNodes,
      importantNodesThreshold,
    };

    console.log("Apply button clicked. Settings:", settings);
    console.log("Highlighted communities:", highlightCommunities);
    onApplyCustomization(settings);
  };

  return (
    <Card className="customization-toolbar mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <Palette size={20} className="me-2" />
          <h5 className="mb-0">Visualization Customization</h5>
        </div>
        <Button
          variant="link"
          className="toggle-btn no-underline"
          onClick={() => setShowToolbar(!showToolbar)}
        >
          {showToolbar ? "−" : "+"}
        </Button>
      </Card.Header>

      {showToolbar && (
        <Card.Body>
          <Row>
            <Col md={4} className="mb-3">
              <Form.Group>
                <Form.Label className="d-flex align-items-center">
                  <CircleFill size={16} className="me-2" />
                  Color Nodes By:
                </Form.Label>
                <Form.Select
                  value={colorBy}
                  onChange={(e) => setColorBy(e.target.value)}
                  className="research-input"
                >
                  <option value="default">Default Color</option>
                  <option value="community">Communities</option>
                  <option value="degree">Degree Centrality</option>
                  <option value="betweenness">Betweenness Centrality</option>
                  <option value="pagerank">PageRank Centrality</option>
                  <option value="custom">Custom Nodes</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4} className="mb-3">
              <Form.Group>
                <Form.Label className="d-flex align-items-center">
                  <CircleFill size={16} className="me-2" />
                  Size Nodes By:
                </Form.Label>
                <Form.Select
                  value={sizeBy}
                  onChange={(e) => setSizeBy(e.target.value)}
                  className="research-input"
                >
                  <option value="default">Default Size</option>
                  <option value="messages">Message Count</option>
                  <option value="degree">Degree Centrality</option>
                  <option value="betweenness">Betweenness Centrality</option>
                  <option value="pagerank">PageRank Centrality</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4} className="mb-3">
              <Form.Group>
                <Form.Label className="d-flex align-items-center">
                  <Palette size={16} className="me-2" />
                  Color Scheme:
                </Form.Label>
                <Form.Select
                  value={colorScheme}
                  onChange={(e) => handleColorSchemeChange(e.target.value)}
                  className="research-input"
                >
                  <option value="default">Default</option>
                  <option value="pastel">Pastel</option>
                  <option value="vivid">Vivid</option>
                  <option value="monochrome">Monochrome</option>
                  <option value="colorful">Colorful</option>
                  <option value="sequential">Sequential</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={3} className="mb-3">
              <Form.Group>
                <Form.Label>Default Node Color:</Form.Label>
                <Form.Control
                  type="color"
                  value={customColors.defaultNodeColor}
                  onChange={(e) =>
                    handleColorChange("defaultNodeColor", e.target.value)
                  }
                  className="research-input"
                />
              </Form.Group>
            </Col>

            <Col md={3} className="mb-3">
              <Form.Group>
                <Form.Label>Highlight Node Color:</Form.Label>
                <Form.Control
                  type="color"
                  value={customColors.highlightNodeColor}
                  onChange={(e) =>
                    handleColorChange("highlightNodeColor", e.target.value)
                  }
                  className="research-input"
                />
              </Form.Group>
            </Col>

            <Col md={3} className="mb-3">
              <Form.Group>
                <Form.Label>Min Node Size:</Form.Label>
                <Form.Control
                  type="number"
                  min="5"
                  max="20"
                  value={nodeSizes.min}
                  onChange={(e) => handleNodeSizeChange("min", e.target.value)}
                  className="research-input"
                />
              </Form.Group>
            </Col>

            <Col md={3} className="mb-3">
              <Form.Group>
                <Form.Label>Max Node Size:</Form.Label>
                <Form.Control
                  type="number"
                  min="20"
                  max="100"
                  value={nodeSizes.max}
                  onChange={(e) => handleNodeSizeChange("max", e.target.value)}
                  className="research-input"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12} className="mb-3">
              <Form.Group>
                <Form.Check
                  type="checkbox"
                  id="show-important-nodes"
                  label="Highlight Important Nodes"
                  checked={showImportantNodes}
                  onChange={(e) => setShowImportantNodes(e.target.checked)}
                  className="mb-2"
                />
                {showImportantNodes && (
                  <div className="d-flex align-items-center">
                    <Form.Label className="mb-0 me-2">
                      Importance Threshold:
                    </Form.Label>
                    <Form.Range
                      min="0"
                      max="100"
                      step="5"
                      value={importantNodesThreshold * 100}
                      onChange={(e) =>
                        setImportantNodesThreshold(
                          parseInt(e.target.value) / 100
                        )
                      }
                      className="ms-2"
                    />
                    <span className="ms-2">
                      {Math.round(importantNodesThreshold * 100)}%
                    </span>
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>

          {communities && communities.length > 0 && (
            <Row className="mt-2">
              <Col md={12}>
                <Card className="community-card p-2">
                  <h6 className="d-flex align-items-center">
                    <PeopleFill size={16} className="me-2" />
                    Community Customization:
                    <span className="badge bg-primary ms-2">
                      {communities.length} communities
                    </span>
                  </h6>

                  <div className="community-colors-container">
                    <Table responsive size="sm" className="community-table">
                      <thead>
                        <tr>
                          <th>Community</th>
                          <th>Node Count</th>
                          <th>Color</th>
                          <th>Highlight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {communities.map((community, index) => (
                          <tr key={community.id}>
                            <td>
                              {editingCommunityId === community.id ? (
                                <InputGroup>
                                  <Form.Control
                                    type="text"
                                    value={tempCommunityName}
                                    onChange={(e) =>
                                      setTempCommunityName(e.target.value)
                                    }
                                    size="sm"
                                  />
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() =>
                                      handleSaveCommunityName(community.id)
                                    }
                                  >
                                    <CheckSquare size={16} />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={handleCancelEditName}
                                  >
                                    <XSquare size={16} />
                                  </Button>
                                </InputGroup>
                              ) : (
                                <div className="d-flex align-items-center">
                                  <span className="me-2">
                                    {communityNames[community.id] ||
                                      `Community ${community.id}`}
                                  </span>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() =>
                                      handleEditCommunityName(community.id)
                                    }
                                  >
                                    <PencilSquare size={14} />
                                  </Button>
                                </div>
                              )}
                            </td>
                            <td>{community.size}</td>
                            <td>
                              <Form.Control
                                type="color"
                                value={
                                  communityColors[community.id] ||
                                  colorSchemes[colorScheme][
                                    index % colorSchemes[colorScheme].length
                                  ]
                                }
                                onChange={(e) =>
                                  handleCommunityColorChange(
                                    community.id,
                                    e.target.value
                                  )
                                }
                                className="community-color-picker"
                              />
                            </td>
                            <td>
                              <Form.Check
                                type="switch"
                                checked={highlightCommunities.includes(
                                  community.id
                                )}
                                onChange={() =>
                                  handleToggleCommunity(community.id)
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </Col>
            </Row>
          )}

          {colorBy === "custom" && (
            <Row className="mt-2">
              <Col md={12}>
                <Card className="important-nodes-card p-2">
                  <h6 className="mb-2 d-flex align-items-center">
                    <PersonBadge size={16} className="me-2" />
                    Highlight Important Nodes
                  </h6>

                  <div className="important-node-tabs">
                    <nav>
                      <div className="nav nav-tabs mb-2" role="tablist">
                        <button
                          className="nav-link active"
                          id="degree-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#degree"
                          type="button"
                          role="tab"
                        >
                          By Degree
                        </button>
                        <button
                          className="nav-link"
                          id="betweenness-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#betweenness"
                          type="button"
                          role="tab"
                        >
                          By Betweenness
                        </button>
                        <button
                          className="nav-link"
                          id="pagerank-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#pagerank"
                          type="button"
                          role="tab"
                        >
                          By PageRank
                        </button>
                      </div>
                    </nav>
                    <div className="tab-content">
                      <div
                        className="tab-pane fade show active"
                        id="degree"
                        role="tabpanel"
                      >
                        <div className="highlighted-items-container">
                          {sortedByDegree.slice(0, 8).map((node) => (
                            <Button
                              key={node.id}
                              size="sm"
                              variant={
                                highlightUsers.includes(node.id)
                                  ? "primary"
                                  : "outline-secondary"
                              }
                              className="m-1"
                              onClick={() => handleToggleUser(node.id)}
                            >
                              {node.id} (D: {node.degree.toFixed(2)})
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div
                        className="tab-pane fade"
                        id="betweenness"
                        role="tabpanel"
                      >
                        <div className="highlighted-items-container">
                          {sortedByBetweenness.slice(0, 8).map((node) => (
                            <Button
                              key={node.id}
                              size="sm"
                              variant={
                                highlightUsers.includes(node.id)
                                  ? "primary"
                                  : "outline-secondary"
                              }
                              className="m-1"
                              onClick={() => handleToggleUser(node.id)}
                            >
                              {node.id} (B: {node.betweenness.toFixed(2)})
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div
                        className="tab-pane fade"
                        id="pagerank"
                        role="tabpanel"
                      >
                        <div className="highlighted-items-container">
                          {sortedByPageRank.slice(0, 8).map((node) => (
                            <Button
                              key={node.id}
                              size="sm"
                              variant={
                                highlightUsers.includes(node.id)
                                  ? "primary"
                                  : "outline-secondary"
                              }
                              className="m-1"
                              onClick={() => handleToggleUser(node.id)}
                            >
                              {node.id} (PR: {node.pagerank.toFixed(4)})
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          )}

          <Row className="mt-3">
            <Col className="d-flex justify-content-end">
              <Button className="filter-btn" onClick={handleApplyCustomization}>
                Apply Customization
              </Button>
            </Col>
          </Row>
        </Card.Body>
      )}
    </Card>
  );
};

export default NetworkCustomizationToolbar;
