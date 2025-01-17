import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle } from 'lucide-react';

const SiemensChar = (dist_char_angle, X, R, a1_angle = 30, a2_angle = 22, inclination_angle = 0) => {
  // Convert angles to radians
  a1_angle = a1_angle * Math.PI / 180;
  a2_angle = a2_angle * Math.PI / 180;
  dist_char_angle = dist_char_angle * Math.PI / 180;
  inclination_angle = inclination_angle * Math.PI / 180;

  // Initialize data points
  const data_points = {
    R: [0],
    X: [0]
  };

  // Second coordinate
  let r = -X * Math.tan(a1_angle);
  data_points.R.push(r);
  data_points.X.push(X);

  // Third coordinate
  if (inclination_angle === 0) {
    r = X / Math.tan(dist_char_angle) + R;
  } else {
    r = X / Math.tan(dist_char_angle);
  }
  data_points.R.push(r);
  data_points.X.push(X);

  // Fourth coordinate
  let x;
  if (inclination_angle === 0) {
    r = R * (1 - Math.tan(a2_angle) / (Math.tan(a2_angle) + Math.tan(dist_char_angle)));
    x = -R * (Math.tan(a2_angle) * Math.tan(dist_char_angle)) / (Math.tan(a2_angle) + Math.tan(dist_char_angle));
  } else {
    r = X / Math.tan(dist_char_angle) + R * (
      1 - Math.tan(inclination_angle) / (Math.tan(inclination_angle) + Math.tan(dist_char_angle)));
    x = X - R * (Math.tan(inclination_angle) * Math.tan(dist_char_angle)) / (
      Math.tan(inclination_angle) + Math.tan(dist_char_angle));
  }
  data_points.R.push(r);
  data_points.X.push(x);

  // Fifth coordinate
  if (inclination_angle !== 0) {
    r = R * (1 - Math.tan(a2_angle) / (Math.tan(a2_angle) + Math.tan(dist_char_angle)));
    x = -R * (Math.tan(a2_angle) * Math.tan(dist_char_angle)) / (Math.tan(a2_angle) + Math.tan(dist_char_angle));
    data_points.R.push(r);
    data_points.X.push(x);
  }

  // Trim polygon negative reactance
  if (data_points.X[data_points.X.length - 1] <= -X) {
    const x_new1 = -X;
    const r_new1 = (data_points.R[data_points.R.length - 2] - data_points.R[data_points.R.length - 1]) /
      (data_points.X[data_points.X.length - 2] - data_points.X[data_points.X.length - 1]) *
      (x_new1 - data_points.X[data_points.X.length - 1]) + data_points.R[data_points.R.length - 1];

    const r_new2 = X / Math.tan(a2_angle);
    const x_new2 = -X;

    data_points.R[data_points.R.length - 1] = r_new1;
    data_points.X[data_points.X.length - 1] = x_new1;
    data_points.R.push(r_new2);
    data_points.X.push(x_new2);
  }

  if ((data_points.X[3] < data_points.X[4]) && (inclination_angle !== 0)) {
    data_points.X.splice(4, 1);
    data_points.R.splice(4, 1);
  }
  if ((data_points.X[data_points.X.length - 2] < data_points.X[data_points.X.length - 1]) && (inclination_angle !== 0)) {
    data_points.X.splice(data_points.X.length - 1, 1);
    data_points.R.splice(data_points.X.length - 1, 1);
  }

  return data_points.R.map((r, i) => ({ R: r, X: data_points.X[i] }));
};

const InteractivePlot = () => {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const [params, setParams] = useState({
    distCharAngle: 75,
    X: 30,
    R: 30,
    a1Angle: 30,
    a2Angle: 22,
    inclinationAngle: 0
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries[0]) return;
      const { width } = entries[0].contentRect;
      setDimensions({
        width: width,
        height: width * 0.6  // maintain aspect ratio
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

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

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 50, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const xDomain = [-50, 50];
    const yDomain = [-50, 50];

    const xScale = d3.scaleLinear()
      .domain(xDomain)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    svg.append('defs')
      .append('clipPath')
      .attr('id', 'plot-area')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    const gridGroup = g.append('g')
      .attr('class', 'grid')
      .attr('clip-path', 'url(#plot-area)');

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    const xAxisGroup = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    const yAxisGroup = g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    const updateAxes = (transform) => {
      const newXScale = transform.rescaleX(xScale);
      const newYScale = transform.rescaleY(yScale);
      xAxisGroup.call(xAxis.scale(newXScale));
      yAxisGroup.call(yAxis.scale(newYScale));
    };

    const updateGrid = (transform) => {
      const newXScale = transform.rescaleX(xScale);
      const newYScale = transform.rescaleY(yScale);

      gridGroup.selectAll('*').remove();

      gridGroup.selectAll('.vertical-grid')
        .data(newXScale.ticks())
        .join('line')
        .attr('x1', d => newXScale(d))
        .attr('x2', d => newXScale(d))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 0.5);

      gridGroup.selectAll('.horizontal-grid')
        .data(newYScale.ticks())
        .join('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => newYScale(d))
        .attr('y2', d => newYScale(d))
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 0.5);
    };

    const contentGroup = g.append('g')
      .attr('clip-path', 'url(#plot-area)');

    const polygonPoints = SiemensChar(
      params.distCharAngle,
      params.X,
      params.R,
      params.a1Angle,
      params.a2Angle,
      params.inclinationAngle
    );

    const lineGenerator = d3.line()
      .x(d => xScale(d.R))
      .y(d => yScale(d.X))
      .curve(d3.curveLinearClosed);

    contentGroup.append('path')
      .datum(polygonPoints)
      .attr('d', lineGenerator)
      .attr('fill', '#3b82f680')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1);

    if (data.length > 0) {
      contentGroup.selectAll('circle')
        .data(data)
        .join('circle')
        .attr('cx', d => xScale(d.R))
        .attr('cy', d => yScale(d.X))
        .attr('r', 1)
        .attr('fill', '#ef4444')
        .attr('opacity', 0.7);
    }

    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on('zoom', (event) => {
        const transform = event.transform;
        contentGroup.attr('transform', transform);
        updateAxes(transform);
        updateGrid(transform);
      });

    const resetTool = svg.append('g')
      .attr('transform', 'translate(10, 10)')
      .style('cursor', 'pointer')
      .on('click', () => {
        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
      });

    resetTool.append('rect')
      .attr('width', 30)
      .attr('height', 30)
      .attr('rx', 5)
      .attr('fill', 'white')
      .attr('stroke', '#e5e7eb');

    resetTool.append('path')
      .attr('d', 'M15,10 L15,20 M10,15 L20,15')
      .attr('stroke', '#374151')
      .attr('stroke-width', 2)
      .attr('transform', 'rotate(45, 15, 15)');

    svg.call(zoom);
    updateGrid(d3.zoomIdentity);

  }, [data, params, dimensions]);

  const handleParamChange = (param, value) => {
    setParams(prev => ({
      ...prev,
      [param]: parseFloat(value)
    }));
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600">
        <h2 className="text-2xl font-bold text-white">Distance Protection Visualization</h2>
        <p className="mt-1 text-blue-100">Upload your CSV file with R and X coordinates</p>
      </div>

      <div className="p-6">
        {/* File upload section */}
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

        {/* Parameter controls */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Distance Characteristic Angle ({params.distCharAngle}°)
            </label>
            <input
              type="range"
              min="0"
              max="90"
              value={params.distCharAngle}
              onChange={(e) => handleParamChange('distCharAngle', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              X Reach ({params.X})
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={params.X}
              onChange={(e) => handleParamChange('X', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              R Reach ({params.R})
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={params.R}
              onChange={(e) => handleParamChange('R', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              A1 Angle ({params.a1Angle}°)
            </label>
            <input
              type="range"
              min="0"
              max="90"
              value={params.a1Angle}
              onChange={(e) => handleParamChange('a1Angle', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              A2 Angle ({params.a2Angle}°)
            </label>
            <input
              type="range"
              min="0"
              max="90"
              value={params.a2Angle}
              onChange={(e) => handleParamChange('a2Angle', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Inclination Angle ({params.inclinationAngle}°)
            </label>
            <input
              type="range"
              min="0"
              max="90"
              value={params.inclinationAngle}
              onChange={(e) => handleParamChange('inclinationAngle', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        {/* Visualization */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <svg ref={svgRef} className="w-full" />
        </div>
      </div>
    </div>
  );
};

export default InteractivePlot;