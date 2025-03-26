import React, { useState } from "react";
import { Alert, Form, Button } from "react-bootstrap";

const WikipediaDataFetcher = ({ setNetworkData, setWikiUrl }) => {
  const [localWikiUrl, setLocalWikiUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFetchData = async () => {
    if (!localWikiUrl.trim()) {
      setMessage("Please enter a Wikipedia discussion page URL.");
      return;
    }

    setWikiUrl(localWikiUrl); 
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8001/fetch-wikipedia-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: localWikiUrl }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched Wikipedia Data:", data);

      if (data.nodes && data.links && data.nodes.length > 0) {
        const processedData = {
          nodes: data.nodes.map(node => ({
            ...node,
            id: String(node.id) 
          })),
          links: data.links.map(link => ({
            ...link,
            source: String(link.source), 
            target: String(link.target)  
          }))
        };
        
        setNetworkData(processedData); 
        setMessage(" Data successfully loaded!");
      } else {
        setMessage(" No valid discussion data found on this Wikipedia page.");
      }
    } catch (error) {
      console.error("Error loading Wikipedia data:", error);
      setMessage(` Server connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wiki-fetcher-container">
      {message && (
        <Alert variant={message.includes("successfully") ? "success" : "danger"}>
          {message}
        </Alert>
      )}

      <Form.Group>
        <Form.Label>Wikipedia Discussion Page URL:</Form.Label>
        <Form.Control
          type="text"
          value={localWikiUrl}
          onChange={(e) => setLocalWikiUrl(e.target.value)}
          placeholder="Example: https://en.wikipedia.org/wiki/Talk:Jerusalem"
        />
      </Form.Group>
      <Button 
        onClick={handleFetchData} 
        disabled={loading}
        className="mt-2 mb-3 w-100"
      >
        {loading ? "Loading..." : "Upload Wikipedia Link"}
      </Button>
    </div>
  );
};

export default WikipediaDataFetcher;