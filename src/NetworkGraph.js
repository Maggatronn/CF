import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';
import ReactSlider from 'react-slider';
import './App.css'; // Import the CSS file
import networkData from './data/network_data.json'; // Assuming the data is static

const NetworkGraph = () => {
  const [filteredData, setFilteredData] = useState(networkData);
  const [organizerContactCounts, setOrganizerContactCounts] = useState([]); // State for bar graph data
  const [highlightedNode, setHighlightedNode] = useState(null); // State for node highlighting
  const barChartRef = useRef(null); // Ref for the bar chart container
  const graphRef = useRef(); // Create a reference to the graph

  // Initialize and set the data when the component mounts
  useEffect(() => {
    setFilteredData(networkData);
  }, []);
  
   // Apply custom forces for horizontal spread once the graph has mounted
  useEffect(() => {
    const graph = graphRef.current;
    if (graph) {
      // Spread the nodes more horizontally by applying a force along the x-axis
      graph.d3Force('charge').strength(-20); // Repulsion force
      graph.d3Force('link').distance(20); // Increase link distance to spread out more

      // Apply a custom force to push nodes horizontally
      graph.d3Force('x', d3.forceX().strength(0.01)); // Horizontal force to spread out along x-axis
      graph.d3Force('y', d3.forceY().strength(0.05)); // Weak vertical force to reduce vertical spread
    }
  }, [filteredData]); 

  // Count the number of links each organizer has
  const countOrganizerContacts = (nodes, links) => {
    const counts = nodes
      .filter(node => node.organizer) // Only consider nodes where organizer is true
      .map((node) => {
        // Count the number of links where the node is either the source or the target
        const contactCount = links.filter((link) => link.source === node.id || link.target === node.id).length;
        return { name: node.name, id: node.id, count: contactCount };
      });

    setOrganizerContactCounts(counts); // Update the state with the contact counts
  };

  // Initialize and count contacts for organizer nodes
  useEffect(() => {
    const { nodes, links } = networkData;
    setFilteredData({ nodes, links });
    countOrganizerContacts(nodes, links);
  }, []); // Run once on component mount

  // Custom node rendering for organizer nodes to always display labels
  const renderNode = (node, ctx, globalScale) => {
    const label = node.name;
    const fontSize = 12 / globalScale; // Adjust font size based on zoom level

    // Draw the node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
    ctx.fillStyle = node === highlightedNode ? 'red' : node.organizer ? 'white' : '#ff7f50'; // Highlight node or set color based on organizer status
    ctx.fill();

    // If the node is an organizer, always display its label
    if (node.organizer || node === highlightedNode) {
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // ctx.fillStyle = 'white'; // Label color
      ctx.fillStyle = node === highlightedNode ? 'red' : node.organizer ? 'white' : '#ff7f50'; // Highlight node or set color based on organizer status
      ctx.fillText(label, node.x, node.y - 8); // Display the label slightly above the node
    }
  };

  // D3 Bar Chart rendering with hover interaction
  useEffect(() => {
    if (organizerContactCounts.length > 0) {
      d3.select(barChartRef.current).selectAll('*').remove(); // Clear existing content

      // Set up dimensions
      const width = window.innerWidth * 0.7;
      const height = 250;
      const margin = { top: 20, right: 30, bottom: 120, left: 40 };

      // Create SVG
      const svg = d3
        .select(barChartRef.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      // Create scales
      const x = d3
        .scaleBand()
        .domain(organizerContactCounts.map((d) => d.name))
        .range([margin.left, width - margin.right])
        .padding(0.1);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(organizerContactCounts, (d) => d.count)])
        .nice()
        .range([height - margin.bottom, margin.top]);

      // Append axes
      svg
        .append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll('text') // Rotate labels for better readability
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

      svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y));

      // Append bars with hover interaction
      svg
        .selectAll('.bar')
        .data(organizerContactCounts)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => x(d.name))
        .attr('y', (d) => y(d.count))
        .attr('width', x.bandwidth())
        .attr('height', (d) => y(0) - y(d.count))
        .attr('fill', '#ff7f50')
        .on('mouseover', function(event, d) {
          const node = filteredData.nodes.find(node => node.id === d.id);
          setHighlightedNode(node); // Highlight the corresponding node in the network graph

          d3.select(this).attr('fill', 'red'); // Change rectangle color to red on hover
        })
        .on('mouseout', function() {
          setHighlightedNode(null); // Remove the highlight when mouse leaves the bar

          d3.select(this).attr('fill', '#ff7f50'); // Reset rectangle color on mouse out
        });
    }
  }, [organizerContactCounts, filteredData]); // This hook will run whenever organizerContactCounts is updated

  // Highlight the bar when hovering over the node in the graph
  const handleNodeHover = (node) => {
    if (node && node.organizer) {
      setHighlightedNode(node); // Highlight the node
      const bars = d3.select(barChartRef.current).selectAll('.bar');
      bars.each(function (d) {
        if (d.id === node.id) {
          d3.select(this).attr('fill', 'red'); // Highlight the corresponding bar
        } else {
          d3.select(this).attr('fill', '#ff7f50'); // Reset the color for other bars
        }
      });
    } else {
      setHighlightedNode(null); // Clear the highlight
      d3.select(barChartRef.current).selectAll('.bar').attr('fill', '#ff7f50'); // Reset all bars
    }
  };

  return (
    <div className="network-container">
      {/* Header Section */}
      <header className="header-section">
        <h1 className="site-title">Carolina Federation Network Map</h1>
        <p className="description">
          Explore the network of organizers and their connections. Hover over nodes and bars to interact with the graph.
        </p>
      </header>
      <div className="graph-section">
        {filteredData ? (
          <ForceGraph2D
            ref={graphRef} // Assign the reference to the graph
            graphData={filteredData}
            nodeCanvasObject={renderNode} // Use the custom node rendering function
            nodeAutoColorBy="group"
            linkColor={() => '#6363A6'}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={(d) => d.value * 0.001}
            width={window.innerWidth * 0.7} // Adjust width for the graph
            height={window.innerHeight * 0.55}
            backgroundColor="#1F1F34"
            d3VelocityDecay={0.6} // Adjust the rate of movement decay for stability
            // onEngineStop={handleGraphReady} // Call when graph engine is ready
            onNodeHover={handleNodeHover} // Highlight the bar when hovering over the node
          />
        ) : (
          <p>Loading data...</p>
        )}
      </div>
      <div className="bar-chart-section">
        <h3 style={{ color: 'white' }}>Organizer Contact Counts</h3>
        <div ref={barChartRef}></div> {/* Bar chart container */}
      </div>
    </div>
  );
};

export default NetworkGraph;