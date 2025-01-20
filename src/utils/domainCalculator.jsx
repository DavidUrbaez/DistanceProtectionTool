// utils/domainCalculator.js
import { SiemensChar } from '../components/InteractivePlot';
export const calculateDomains = (zoneParams, FIXED_A1_ANGLE, FIXED_A2_ANGLE) => {
    const allPolygonPoints = [];
    [1, 2, 3].forEach(zone => {
        const params = zoneParams[zone];
        const points = SiemensChar(
            params.distCharAngle,
            params.X,
            params.R,
            FIXED_A1_ANGLE,
            FIXED_A2_ANGLE,
            params.inclinationAngle
        );
        allPolygonPoints.push(...points);
    });

    const maxR = Math.max(...allPolygonPoints.map(p => Math.abs(p.R))) * 1.5;
    const maxX = Math.max(...allPolygonPoints.map(p => Math.abs(p.X))) * 1.5;
    const maxValue = Math.max(maxR, maxX);

    return {
        xDomain: [-maxValue * 0.5, maxValue],
        yDomain: [-maxValue * 0.5, maxValue]
    };
};