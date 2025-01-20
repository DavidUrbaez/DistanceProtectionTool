import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle } from 'lucide-react';

import { calculateDomains } from '../utils/domainCalculator';
import { drawScatterPlot } from './drawScatterPlot';
import { drawPolygons } from './drawPolygons';

import { CSVUpload } from './CSVHandler/SimpleCSVLoader'

// Zone color mapping - Updated to match screenshot
// Update the zoneColors configuration
export const zoneColors = {
  1: {
    fill: '#ef4444',
    stroke: '#ef4444',
    polygonOpacity: 0.2,    // More transparent for polygons
    pointOpacity: 0.8       // Less transparent for points
  },
  2: {
    fill: '#4ade80',
    stroke: '#4ade80',
    polygonOpacity: 0.2,
    pointOpacity: 0.8
  },
  3: {
    fill: '#60a5fa',
    stroke: '#60a5fa',
    polygonOpacity: 0.2,
    pointOpacity: 0.8
  },
  default: {
    fill: '#94a3b8',
    stroke: '#94a3b8',
    polygonOpacity: 0.2,
    pointOpacity: 0.8
  }
};


const InteractivePlot = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedZone, setSelectedZone] = useState(null);

  const [zoneParams, setZoneParams] = useState({
    1: {
      distCharAngle: 75,
      X: 20,
      R: 20,
      inclinationAngle: 0
    },
    2: {
      distCharAngle: 75,
      X: 35,
      R: 35,
      inclinationAngle: 0
    },
    3: {
      distCharAngle: 75,
      X: 50,
      R: 50,
      inclinationAngle: 0
    }
  });


  const handleParsedData = (parsedData) => {
    setData(parsedData); // Update the component's data state
    setError(''); // Clear any existing errors
  };

  const handleParamChange = (zone, param, value) => {
    setZoneParams(prev => ({
      ...prev,
      [zone]: {
        ...prev[zone],
        [param]: parseFloat(value)
      }
    }));
  };

  const handleOptimize = () => {
    if (!data || data.length === 0) {
      console.log('Please upload data before optimizing parameters');
      setError('Please upload data before optimizing parameters');
      return;
    }

    try {
      console.log('Starting optimization...');
      const newZoneParams = { ...zoneParams };
      const round2Dec = (num) => Number(Math.round(num + 'e2') + 'e-2');

      // Helper function to check if a point is inside the polygon
      const isPointInside = (x, r, params) => {
        const angleRad = params.distCharAngle * Math.PI / 180;
        const inclRad = params.inclinationAngle * Math.PI / 180;
        const a1Rad = params.a1Angle * Math.PI / 180;
        const a2Rad = params.a2Angle * Math.PI / 180;

        const xRot = x * Math.cos(inclRad) + r * Math.sin(inclRad);
        const rRot = -x * Math.sin(inclRad) + r * Math.cos(inclRad);

        const pointAngle = Math.atan2(xRot, rRot);
        if (Math.abs(pointAngle) > angleRad) return false;
        if (Math.abs(xRot) > params.X || Math.abs(rRot) > params.R) return false;
        if (pointAngle > 0 && pointAngle > (angleRad - a1Rad)) return false;
        if (pointAngle < 0 && pointAngle < -(angleRad - a2Rad)) return false;

        return true;
      };

      // Calculate polygon area (approximate)
      const calculateArea = (params) => {
        return params.X * params.R * (params.distCharAngle * Math.PI / 180);
      };

      class GeneticOptimizer {
        constructor(currentZone, allPoints, prevZoneParams) {
          this.currentZone = currentZone;
          this.allPoints = allPoints;
          this.prevZoneParams = prevZoneParams;
          this.populationSize = 100;
          this.generations = 50;
          this.mutationRate = 0.1;
        }

        createIndividual() {
          // Get minimum bounds from previous zone
          const minX = this.prevZoneParams ? this.prevZoneParams.X : 0;
          const minR = this.prevZoneParams ? this.prevZoneParams.R : 0;

          return {
            distCharAngle: round2Dec(Math.random() * 90),
            X: round2Dec(minX + Math.random() * (100 - minX)),
            R: round2Dec(minR + Math.random() * (100 - minR)),
            inclinationAngle: round2Dec(Math.random() * 30),
            a1Angle: round2Dec(Math.random() * 90),
            a2Angle: round2Dec(Math.random() * 90)
          };
        }

        isZoneAllowed(pointZone, currentZone) {
          if (pointZone === 0) return false;
          if (pointZone === currentZone) return true;
          if (currentZone === 3) return true;
          if (currentZone === 2 && pointZone === 1) return true;
          return false;
        }

        Untitled

        calculateFitness(individual) {
          // Check if X and R satisfy ordering constraints
          if (this.prevZoneParams) {
            if (individual.X <= this.prevZoneParams.X ||
              individual.R <= this.prevZoneParams.R) {
              return -1000; // Heavy penalty for violating ordering
            }
          }

          let pointScore = 0;
          let totalPoints = 0;

          // Score points classification
          this.allPoints.forEach(point => {
            const isInside = isPointInside(point.X, point.R, individual);
            const shouldBeInside = this.isZoneAllowed(point.Zone, this.currentZone);
            totalPoints++;
            if (isInside === shouldBeInside) {
              pointScore += 1; // Count correct classifications
            }
          });

          // Calculate point classification score (80% of total score)
          const pointClassificationScore = (pointScore / totalPoints) * 80;

          // Calculate area minimization score (20% of total score)
          const area = calculateArea(individual);
          const maxPossibleArea = 100 * 100 * (Math.PI / 2); // Worst-case maximum area
          const areaScore = 20 * (1 - (area / maxPossibleArea)); // Lower area gets higher score

          // Add a penalty for divergence in distribution characteristic angles
          let angleScore = 0;
          if (this.prevZoneParams) {
            const prevDistCharAngle = this.prevZoneParams.distCharAngle;
            const currentDistCharAngle = individual.distCharAngle;

            // Calculate angle difference penalty
            const angleDifference = Math.abs(prevDistCharAngle - currentDistCharAngle);
            const maxAllowedDifference = 45; // Adjust this value as needed

            // Penalize large differences, reward small differences
            const anglePenalty = Math.max(0, angleDifference - maxAllowedDifference);
            angleScore = Math.max(0, 10 - (anglePenalty * 0.2)); // Adjust multiplier as needed
          }

          // Combine scores
          return pointClassificationScore + areaScore + angleScore;
        }

        crossover(parent1, parent2) {
          const child = {};
          Object.keys(parent1).forEach(key => {
            child[key] = round2Dec(Math.random() < 0.5 ? parent1[key] : parent2[key]);
          });
          return child;
        }

        mutate(individual) {
          const mutated = { ...individual };
          const minX = this.prevZoneParams ? this.prevZoneParams.X : 0;
          const minR = this.prevZoneParams ? this.prevZoneParams.R : 0;

          Object.keys(mutated).forEach(key => {
            if (Math.random() < this.mutationRate) {
              const change = (Math.random() - 0.5) * 10;
              switch (key) {
                case 'distCharAngle':
                  mutated[key] = round2Dec(Math.max(0, Math.min(90, mutated[key] + change)));
                  break;
                case 'inclinationAngle':
                  mutated[key] = round2Dec(Math.max(0, Math.min(30, mutated[key] + change)));
                  break;
                case 'X':
                  mutated[key] = round2Dec(Math.max(minX + 0.1, Math.min(100, mutated[key] + change)));
                  break;
                case 'R':
                  mutated[key] = round2Dec(Math.max(minR + 0.1, Math.min(100, mutated[key] + change)));
                  break;
                case 'a1Angle':
                case 'a2Angle':
                  mutated[key] = round2Dec(Math.max(0, Math.min(90, mutated[key] + change)));
                  break;
              }
            }
          });
          return mutated;
        }

        selectParent(population, fitnesses) {
          const tournamentSize = 5;
          let bestIndex = Math.floor(Math.random() * population.length);
          let bestFitness = fitnesses[bestIndex];

          for (let i = 0; i < tournamentSize - 1; i++) {
            const index = Math.floor(Math.random() * population.length);
            if (fitnesses[index] > bestFitness) {
              bestIndex = index;
              bestFitness = fitnesses[index];
            }
          }

          return population[bestIndex];
        }

        optimize() {
          let population = Array(this.populationSize).fill(null).map(() => this.createIndividual());
          let bestSolution = population[0];
          let bestFitness = -Infinity;

          for (let generation = 0; generation < this.generations; generation++) {
            const fitnesses = population.map(individual => this.calculateFitness(individual));

            const maxFitness = Math.max(...fitnesses);
            const maxIndex = fitnesses.indexOf(maxFitness);

            if (maxFitness > bestFitness) {
              bestFitness = maxFitness;
              bestSolution = { ...population[maxIndex] };
            }

            const newPopulation = [];
            while (newPopulation.length < this.populationSize) {
              const parent1 = this.selectParent(population, fitnesses);
              const parent2 = this.selectParent(population, fitnesses);
              let offspring = this.crossover(parent1, parent2);
              offspring = this.mutate(offspring);
              newPopulation.push(offspring);
            }

            population = newPopulation;
          }

          return bestSolution;
        }
      }

      // Process zones in ascending order to maintain R and X ordering
      let prevZoneParams = null;
      [1, 2, 3].forEach(zone => {
        console.log(`Optimizing zone ${zone}...`);

        const optimizer = new GeneticOptimizer(zone, data, prevZoneParams);
        const optimizedParams = optimizer.optimize();

        newZoneParams[zone] = {
          distCharAngle: round2Dec(Math.max(0, Math.min(90, optimizedParams.distCharAngle))),
          X: round2Dec(Math.max(prevZoneParams ? prevZoneParams.X + 0.1 : 0, Math.min(100, optimizedParams.X))),
          R: round2Dec(Math.max(prevZoneParams ? prevZoneParams.R + 0.1 : 0, Math.min(100, optimizedParams.R))),
          a1Angle: round2Dec(Math.max(0, Math.min(90, optimizedParams.a1Angle))),
          a2Angle: round2Dec(Math.max(0, Math.min(90, optimizedParams.a2Angle))),
          inclinationAngle: round2Dec(Math.max(0, Math.min(30, optimizedParams.inclinationAngle)))
        };

        prevZoneParams = newZoneParams[zone];
      });

      console.log('Final optimized parameters:', newZoneParams);
      setZoneParams(newZoneParams);
      setError('');
    } catch (error) {
      console.error('Optimization error:', error);
      setError('Error optimizing parameters: ' + error.message);
    }
  };

  // Plotting script
  const currentZoomRef = useRef(d3.zoomIdentity);

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

    const { xDomain, yDomain } = calculateDomains(zoneParams);

    //const xDomain = [-maxValue * 0.5, maxValue];
    //const yDomain = [-maxValue * 0.5, maxValue];
    // ---------------------------------------------------------------------------------

    const xScale = d3.scaleLinear()
      .domain(xDomain)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create separate groups for clipped and unclipped content
    const clippedGroup = g.append('g')
      .attr('class', 'clipped-content');


    // Apply clip path only to the clipped group
    svg.append('defs')
      .append('clipPath')
      .attr('id', 'plot-area')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    clippedGroup.attr('clip-path', 'url(#plot-area)');

    // Add grid to clipped group
    const gridGroup = clippedGroup.append('g')
      .attr('class', 'grid');

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
    // Update the updateGrid function to use the clippedGroup:
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

    const lineGenerator = d3.line()
      .x(d => xScale(d.R))
      .y(d => yScale(d.X))
      .curve(d3.curveLinearClosed);


    drawPolygons({ contentGroup, zoneParams, xScale, yScale, selectedZone });
    drawScatterPlot({ contentGroup, data, xScale, yScale, selectedZone });

    // Rest of your code remains the same, but make sure to update the zoom handler:
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on('zoom', (event) => {
        const transform = event.transform;
        // Store the current transform
        currentZoomRef.current = transform;

        gridGroup.attr('transform', transform);
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
    svg.call(zoom.transform, currentZoomRef.current);
    updateGrid(d3.zoomIdentity);
    // Apply the stored transform to initial groups
    gridGroup.attr('transform', currentZoomRef.current);
    contentGroup.attr('transform', currentZoomRef.current);
    updateAxes(currentZoomRef.current);

  }, [data, zoneParams, dimensions, selectedZone]);

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div class="p-6 bg-gradient-to-r from-blue-500 to-blue-600"><h2 class="text-2xl font-bold text-white">Distance Protection Visualization</h2><p class="mt-1 text-blue-100">Upload your CSV file with R and X coordinates</p></div>
      <div className="p-4">

        <CSVUpload onDataParsed={handleParsedData} />

        <div className="flex items-center">
          <div className="flex-1 p-4">
            <div ref={containerRef} className="bg-white rounded-lg border border-gray-200">
              <svg
                ref={svgRef}
                style={{ overflow: '' }} // Add this style
                className="w-full" />
            </div>

          </div>

          <div className="w-64 bg-gray-50 p-3 rounded-lg">
            <style>
              {`
                .custom-range {
                  -webkit-appearance: none;
                  width: 100%;
                  background: transparent;
                  padding: 8px 0;
                  margin: -8px 0;
                }
  
                .custom-range:focus {
                  outline: none;
                }
  
                .custom-range::-webkit-slider-runnable-track {
                  width: 100%;
                  height: 4px;
                  cursor: pointer;
                  background: linear-gradient(to right, var(--zone-color) var(--value-percent), #e5e7eb var(--value-percent));
                  border-radius: 2px;
                }
  
                .custom-range::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  height: 16px;
                  width: 16px;
                  border-radius: 50%;
                  background: #fff;
                  border: 2px solid var(--zone-color, #374151);
                  cursor: pointer;
                  margin-top: -6px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease;
                }
  
                .custom-range::-webkit-slider-thumb:hover {
                  box-shadow: 0 0 0 8px rgba(var(--zone-rgb), 0.1);
                }
  
                .custom-range::-moz-range-track {
                  width: 100%;
                  height: 4px;
                  cursor: pointer;
                  background: linear-gradient(to right, var(--zone-color) var(--value-percent), #e5e7eb var(--value-percent));
                  border-radius: 2px;
                }
  
                .custom-range::-moz-range-thumb {
                  height: 16px;
                  width: 16px;
                  border-radius: 50%;
                  background: #fff;
                  border: 2px solid var(--zone-color, #374151);
                  cursor: pointer;
                  margin-top: -6px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease;
                }
              `}
            </style>

            {[1, 2, 3].map(zone => (
              <div key={zone} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center" style={{ color: zoneColors[zone].stroke }}>
                    Zone {zone}
                  </h3>
                  <div className="text-xs text-gray-500 flex items-center bg-white px-2 py-1 rounded-full">
                    {zoneParams[zone].distCharAngle}° | R:{zoneParams[zone].R} | X:{zoneParams[zone].X} | {zoneParams[zone].inclinationAngle}°
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'distCharAngle', label: 'Dist. Char. Angle', max: 90 },
                    { key: 'R', label: 'R Reach', max: 100 },
                    { key: 'X', label: 'X Reach', max: 100 },
                    { key: 'inclinationAngle', label: 'Inclination', max: 90 }
                  ].map(param => (
                    <div key={param.key} className="flex items-center gap-2">
                      <div className="flex items-center min-w-[5rem]">
                        <span className="text-xs text-gray-600">{param.label}</span>
                      </div>
                      <div className="flex-1 flex items-center">
                        <input
                          type="range"
                          min="0"
                          max={param.max}
                          step="0.1"
                          value={zoneParams[zone][param.key]}
                          onChange={(e) => handleParamChange(zone, param.key, e.target.value)}
                          className="flex-1 custom-range"
                          style={{
                            '--zone-color': zoneColors[zone].stroke,
                            '--zone-rgb': zoneColors[zone].stroke.replace(/[^\d,]/g, ''),
                            '--value-percent': `${(zoneParams[zone][param.key] / param.max) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleOptimize}
          className="mt-4 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
        >
          Optimize Parameters
        </button>
      </div>
    </div>
  );
};

export default InteractivePlot;