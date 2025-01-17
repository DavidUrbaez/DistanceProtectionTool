import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, Upload } from 'lucide-react';
import Papa from 'papaparse';

const RelayVisualization = ({ width = 800, height = 600 }) => {
    const svgRef = useRef(null);
    const [transform, setTransform] = useState(d3.zoomIdentity);
    const [polygonData, setPolygonData] = useState([]);
    const [error, setError] = useState(null);

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // CSV file handling
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            Papa.parse(file, {
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        try {
                            // Process CSV data and convert to polygon points
                            const points = results.data
                                .filter(row => row.R && row.X) // Filter out any incomplete rows
                                .map(row => ({
                                    R: parseFloat(row.R),
                                    X: parseFloat(row.X)
                                }))
                                .filter(point => !isNaN(point.R) && !isNaN(point.X)); // Filter out any NaN values

                            setPolygonData(points);
                            setError(null);
                        } catch (err) {
                            setError('Error processing CSV data. Please check the format.');
                            console.error(err);
                        }
                    }
                },
                header: true,
                skipEmptyLines: true,
                error: (err) => {
                    setError('Error parsing CSV file.');
                    console.error(err);
                }
            });
        }
    };

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([-50, 50])
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([-50, 50])
            .range([innerHeight, 0]);

        // Create zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 10])
            .translateExtent([[0, 0], [width, height]])
            .on('zoom', (event) => {
                setTransform(event.transform);
            });

        svg.call(zoom);

        // Update axes with zoom transform
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);

        svg.select('.x-axis')
            .attr('transform', `translate(${margin.left},${height - margin.bottom})`)
            .call(xAxis);

        svg.select('.y-axis')
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .call(yAxis);

        // Grid lines
        const gridLines = svg.select('.grid-lines');
        gridLines.selectAll('*').remove();

        // Add horizontal grid lines
        gridLines
            .selectAll('.horizontal-grid')
            .data(yScale.ticks())
            .join('line')
            .attr('class', 'horizontal-grid')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', d => yScale(d) + margin.top)
            .attr('y2', d => yScale(d) + margin.top)
            .attr('stroke', '#e5e7eb')
            .attr('stroke-dasharray', '2,2');

        // Add vertical grid lines
        gridLines
            .selectAll('.vertical-grid')
            .data(xScale.ticks())
            .join('line')
            .attr('class', 'vertical-grid')
            .attr('x1', d => xScale(d) + margin.left)
            .attr('x2', d => xScale(d) + margin.left)
            .attr('y1', margin.top)
            .attr('y2', height - margin.bottom)
            .attr('stroke', '#e5e7eb')
            .attr('stroke-dasharray', '2,2');

        // Update polygon
        const vizGroup = svg.select('.visualization-group');
        vizGroup.selectAll('*').remove();

        if (polygonData.length > 0) {
            // Create polygon path
            const lineGenerator = d3.line()
                .x(d => xScale(d.R))
                .y(d => yScale(d.X))
                .curve(d3.curveLinearClosed);

            vizGroup.append('path')
                .datum(polygonData)
                .attr('d', lineGenerator)
                .attr('fill', '#3b82f680')
                .attr('stroke', '#3b82f6')
                .attr('stroke-width', 2);

            // Add points
            vizGroup.selectAll('circle')
                .data(polygonData)
                .join('circle')
                .attr('cx', d => xScale(d.R))
                .attr('cy', d => yScale(d.X))
                .attr('r', 4)
                .attr('fill', '#3b82f6');
        }

    }, [width, height, transform, polygonData]);

    // Zoom control handlers
    const handleReset = () => {
        d3.select(svgRef.current)
            .transition()
            .duration(750)
            .call(
                d3.zoom().transform,
                d3.zoomIdentity
            );
    };

    const handleZoomIn = () => {
        d3.select(svgRef.current)
            .transition()
            .duration(750)
            .call(
                d3.zoom().scaleBy,
                1.5
            );
    };

    const handleZoomOut = () => {
        d3.select(svgRef.current)
            .transition()
            .duration(750)
            .call(
                d3.zoom().scaleBy,
                0.67
            );
    };

    return (
        <div className="relative">
            {/* File upload and error message */}
            <div className="mb-4">
                <label className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload CSV
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>
                {error && (
                    <div className="mt-2 text-red-500">
                        {error}
                    </div>
                )}
            </div>

            {/* Zoom controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                    onClick={handleZoomIn}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <ZoomIn className="w-5 h-5 text-gray-600" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <ZoomOut className="w-5 h-5 text-gray-600" />
                </button>
                <button
                    onClick={handleReset}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <RotateCcw className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Main SVG */}
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="bg-white border border-gray-200 rounded-lg"
            >
                <g className="grid-lines" />
                <g className="x-axis" />
                <g className="y-axis" />
                <g
                    transform={`translate(${margin.left},${margin.top}) scale(${transform.k}) translate(${transform.x},${transform.y})`}
                    className="visualization-group"
                />
            </svg>
        </div>
    );
};

export default RelayVisualization;