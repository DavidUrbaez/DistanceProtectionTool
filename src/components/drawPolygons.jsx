import * as d3 from 'd3';
import { zoneColors } from '../components/InteractivePlot';
import { SiemensChar } from '../utils/SiemensChar';

export const FIXED_A1_ANGLE = 30;
export const FIXED_A2_ANGLE = 22;

export const drawPolygons = ({ contentGroup, zoneParams, xScale, yScale, selectedZone }) => {
    const lineGenerator = d3.line()
        .x(d => xScale(d.R))
        .y(d => yScale(d.X))
        .curve(d3.curveLinearClosed);

    [3, 2, 1].forEach(zone => {
        const params = zoneParams[zone];
        const polygonPoints = SiemensChar(
            params.distCharAngle,
            params.X,
            params.R,
            FIXED_A1_ANGLE,
            FIXED_A2_ANGLE,
            params.inclinationAngle
        );

        contentGroup.append('path')
            .datum(polygonPoints)
            .attr('d', lineGenerator)
            .attr('fill', zoneColors[zone].fill)
            .attr('fill-opacity', zoneColors[zone].polygonOpacity)
            .attr('stroke', zoneColors[zone].stroke)
            .attr('stroke-width', 1)
            .style('opacity', selectedZone === null || selectedZone === zone ? 1 : 0.2);
    });
};