import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, Hand, MousePointer, MoveHorizontal, ZoomIn, RotateCcw, Download } from 'lucide-react';

const InteractivePlot = () => {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [activeTool, setActiveTool] = useState('pan'); // 'pan', 'zoom', 'box-zoom'
  const svgRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      setError('');

      Papa.parse(file, {
        complete: (results) => {
          const points = results.data
            .filter(row => row.R && row.X)
            .map(row => ({
              R: parseFloat(row.R),
              X: parseFloat(row.X)
            }))
            .filter(point => !isNaN(point.R) && !isNaN(point.X));

          if (points.length === 0) {
            setError('No valid data points found');
            return;
          }

          setData(points);
        },
        header: true,
        skipEmptyLines: true,
        error: (error) => {
          setError('Error parsing CSV file');
        }
      });
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 500;
    const margin = { top: 50, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Calculate initial domain with padding
    const xExtent = data.length ? d3.extent(data, d => d.R) : [-50, 50];
    const yExtent = data.length ? d3.extent(data, d => d.X) : [-50, 50];
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([innerHeight, 0]);

    // Create the main container group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add clipping path
    svg.append('defs')
      .append('clipPath')
      .attr('id', 'plot-area')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Add axes groups
    const xAxisGroup = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`);

    const yAxisGroup = g.append('g')
      .attr('class', 'y-axis');

    // Function to update axes
    const updateAxes = (transform) => {
      const newXScale = transform.rescaleX(xScale);
      const newYScale = transform.rescaleY(yScale);
      xAxisGroup.call(xAxis.scale(newXScale));
      yAxisGroup.call(yAxis.scale(newYScale));
    };

    // Add grid lines
    const gridGroup = g.append('g')
      .attr('class', 'grid')
      .attr('clip-path', 'url(#plot-area)');

    // Function to update grid
    const updateGrid = (transform) => {
      const newXScale = transform.rescaleX(xScale);
      const newYScale = transform.rescaleY(yScale);

      gridGroup.selectAll('.grid-line').remove();

      // Vertical grid lines
      gridGroup.selectAll('.vertical-grid')
        .data(newXScale.ticks())
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', d => newXScale(d))
        .attr('x2', d => newXScale(d))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 0.5);

      // Horizontal grid lines
      gridGroup.selectAll('.horizontal-grid')
        .data(newYScale.ticks())
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => newYScale(d))
        .attr('y2', d => newYScale(d))
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 0.5);
    };

    // Create points group
    const pointsGroup = g.append('g')
      .attr('clip-path', 'url(#plot-area)');

    // Add points
    if (data.length > 0) {
      pointsGroup.selectAll('circle')
        .data(data)
        .join('circle')
        .attr('cx', d => xScale(d.R))
        .attr('cy', d => yScale(d.X))
        .attr('r', 5)
        .attr('fill', '#3b82f6')
        .attr('opacity', 0.7);
    }

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on('zoom', (event) => {
        const transform = event.transform;
        pointsGroup.attr('transform', transform);
        updateAxes(transform);
        updateGrid(transform);
      });

    // Initial grid
    updateGrid(d3.zoomIdentity);

    // Add Bokeh-style toolbar
    const toolbar = svg.append('g')
      .attr('transform', `translate(10, 10)`);

    const toolButtons = [
      { icon: Hand, id: 'pan', title: 'Pan Tool' },
      { icon: ZoomIn, id: 'wheel-zoom', title: 'Wheel Zoom Tool' },
      { icon: MousePointer, id: 'box-zoom', title: 'Box Zoom Tool' },
      { icon: RotateCcw, id: 'reset', title: 'Reset' },
      { icon: Download, id: 'save', title: 'Save' }
    ];

    toolButtons.forEach((button, i) => {
      const buttonGroup = toolbar.append('g')
        .attr('transform', `translate(${i * 35}, 0)`)
        .style('cursor', 'pointer');

      buttonGroup.append('rect')
        .attr('width', 30)
        .attr('height', 30)
        .attr('rx', 5)
        .attr('fill', button.id === activeTool ? '#e5e7eb' : 'white')
        .attr('stroke', '#e5e7eb');

      buttonGroup.append('g')
        .attr('transform', 'translate(7, 7)')
        .html(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${button.icon}</svg>`);

      buttonGroup.on('click', () => {
        if (button.id === 'reset') {
          svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        } else if (button.id === 'save') {
          // Implement save functionality
        } else {
          setActiveTool(button.id);
          if (button.id === 'pan') {
            svg.call(zoom);
          } else if (button.id === 'wheel-zoom') {
            svg.call(zoom);
          }
        }
      });
    });

    // Enable initial pan/zoom
    if (activeTool === 'pan' || activeTool === 'wheel-zoom') {
      svg.call(zoom);
    }

  }, [data, activeTool]);

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600">
        <h2 className="text-2xl font-bold text-white">Distance Protection Visualization</h2>
        <p className="mt-1 text-blue-100">Upload your CSV file with R and X coordinates</p>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
              <Upload className="w-5 h-5 mr-2" />
              Choose CSV File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {fileName && (
              <div className="flex items-center text-sm text-gray-600">
                <FileText className="w-4 h-4 mr-1" />
                {fileName}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 flex items-center text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <svg ref={svgRef} className="w-full" />
        </div>
      </div>
    </div>
  );
};

export default InteractivePlot;