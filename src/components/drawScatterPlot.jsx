import * as d3 from 'd3';
import { zoneColors } from '../components/InteractivePlot';
// components/ScatterPlot.js
export const drawScatterPlot = ({ contentGroup, data, xScale, yScale, selectedZone }) => {
    if (data.length > 0) {
        const groupedData = d3.group(data, d => d.Zone);

        groupedData.forEach((points, zone) => {
            const color = zoneColors[zone] || zoneColors.default;

            contentGroup.selectAll(`circle.zone-${zone}`)
                .data(points)
                .join('circle')
                .attr('class', `zone-${zone}`)
                .attr('cx', d => xScale(d.R))
                .attr('cy', d => yScale(d.X))
                .attr('r', 2)
                .attr('fill', color.fill)
                .attr('fill-opacity', color.pointOpacity)
                .attr('stroke', color.stroke)
                .attr('stroke-width', 0.5)
                .attr('opacity', selectedZone === null || selectedZone === zone ? 1 : 0.2);
        });
    }
};