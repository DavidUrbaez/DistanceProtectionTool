import { SiemensChar } from '../components/InteractivePlot';

// Utility function to calculate polygon area
const calculatePolygonArea = (points) => {
    return Math.abs(points.reduce((acc, point, i, arr) => {
        const nextPoint = arr[(i + 1) % arr.length];
        return acc + (point.R * nextPoint.X - nextPoint.R * point.X);
    }, 0) / 2);
};
// Check if a point is inside a polygon using ray casting algorithm
const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].R, yi = polygon[i].X;
        const xj = polygon[j].R, yj = polygon[j].X;

        const intersect = ((yi > point.X) !== (yj > point.X)) &&
            (point.R < (xj - xi) * (point.X - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }
    return inside;
};
// Distance point to line segment calculation
const distancePointToLineSegment = (point, lineStart, lineEnd) => {
    const A = point.R - lineStart.R;
    const B = point.X - lineStart.X;
    const C = lineEnd.R - lineStart.R;
    const D = lineEnd.X - lineStart.X;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let nearestR, nearestX;
    if (param < 0) {
        nearestR = lineStart.R;
        nearestX = lineStart.X;
    } else if (param > 1) {
        nearestR = lineEnd.R;
        nearestX = lineEnd.X;
    } else {
        nearestR = lineStart.R + param * C;
        nearestX = lineStart.X + param * D;
    }

    const dx = point.R - nearestR;
    const dy = point.X - nearestX;
    return Math.sqrt(dx * dx + dy * dy);
};
export const optimizePolygonSettings = (initialData) => {
    // If no initial data is provided, use some default points
    const dataPoints = initialData.length > 0 ? initialData : [
        { R: 10, X: 10 },
        { R: 20, X: 20 },
        { R: 30, X: 30 }
    ];

    const optimizationCriteria = {
        // Minimize area
        minimizeArea: (params) => {
            const points = SiemensChar(
                params.distCharAngle,
                params.X,
                params.R,
                params.a1Angle,
                params.a2Angle,
                params.inclinationAngle
            );

            return -calculatePolygonArea(points);
        },

        // Ensure all data points are inside the polygon
        dataPointContainment: (params, dataPoints) => {
            const points = SiemensChar(
                params.distCharAngle,
                params.X,
                params.R,
                params.a1Angle,
                params.a2Angle,
                params.inclinationAngle
            );

            // Heavily penalize if any point is outside
            const containmentPenalty = dataPoints.reduce((penalty, dataPoint) => {
                return penalty + (isPointInPolygon(dataPoint, points) ? 0 : 1000);
            }, 0);

            return -containmentPenalty;
        }
    };

    // Genetic algorithm for optimization
    const geneticOptimize = (generations = 100, populationSize = 200) => {
        let population = Array.from({ length: populationSize }, () => ({
            distCharAngle: 70 + Math.random() * 20, // 70-90
            X: Math.random() * 50,
            R: Math.random() * 50,
            a1Angle: 30, // Fixed
            a2Angle: 22, // Fixed
            inclinationAngle: (Math.random() * 20) - 10 // -10 to 10
        }));

        for (let gen = 0; gen < generations; gen++) {
            const fitnessScores = population.map(params => {
                const areaScore = optimizationCriteria.minimizeArea(params);
                const containmentScore = optimizationCriteria.dataPointContainment(params, dataPoints);

                // Combine scores with more weight on containment
                return areaScore + containmentScore * 2;
            });

            const sortedPopulation = population
                .map((params, index) => ({ params, fitness: fitnessScores[index] }))
                .sort((a, b) => b.fitness - a.fitness);

            const topHalf = sortedPopulation.slice(0, populationSize / 2);

            population = topHalf.map(({ params }) => params);
            while (population.length < populationSize) {
                const parent1 = topHalf[Math.floor(Math.random() * topHalf.length)].params;
                const parent2 = topHalf[Math.floor(Math.random() * topHalf.length)].params;

                const child = {};
                for (const key in parent1) {
                    if (key === 'distCharAngle') {
                        child[key] = Math.max(70, Math.min(90,
                            (Math.random() < 0.5 ? parent1[key] : parent2[key]) +
                            (Math.random() - 0.5) * 5
                        ));
                    } else if (key === 'a1Angle') {
                        child[key] = 30;
                    } else if (key === 'a2Angle') {
                        child[key] = 22;
                    } else if (key === 'inclinationAngle') {
                        child[key] = Math.max(-10, Math.min(10,
                            (Math.random() < 0.5 ? parent1[key] : parent2[key]) +
                            (Math.random() - 0.5) * 2
                        ));
                    } else {
                        child[key] = Math.random() < 0.5 ? parent1[key] : parent2[key];
                        child[key] += (Math.random() - 0.5) * 5;
                        child[key] = Math.max(0, Math.min(50, child[key]));
                    }
                }
                population.push(child);
            }
        }

        return population[0];
    };

    return geneticOptimize();
};

export const validateOptimizationParams = (params) => {
    return {
        distCharAngle: Math.max(70, Math.min(90, params.distCharAngle || 82.92)),
        X: Math.max(0, Math.min(50, params.X || 30)),
        R: Math.max(0, Math.min(50, params.R || 30)),
        a1Angle: 30,
        a2Angle: 22,
        inclinationAngle: Math.max(-10, Math.min(10, params.inclinationAngle || 0))
    };
};