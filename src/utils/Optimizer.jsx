// Optimizer.jsx
export const handleOptimize = ({ zoneParams, data, setZoneParams, setError }) => {
  if (!data || data.length === 0) {
    console.log('Please upload data before optimizing parameters');
    setError?.('Please upload data before optimizing parameters');
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
      // Fixed A1 and A2 angles
      const a1Rad = 30 * Math.PI / 180;  // Fixed 30 degrees
      const a2Rad = 30 * Math.PI / 180;  // Fixed 30 degrees

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
        const minX = this.prevZoneParams ? this.prevZoneParams.X : 0;
        const minR = this.prevZoneParams ? this.prevZoneParams.R : 0;

        return {
          distCharAngle: round2Dec(Math.random() * 90),
          X: round2Dec(minX + Math.random() * (100 - minX)),
          R: round2Dec(minR + Math.random() * (100 - minR)),
          inclinationAngle: round2Dec(Math.random() * 30),
          // Fixed angles
          a1Angle: 30,
          a2Angle: 30
        };
      }

      isZoneAllowed(pointZone, currentZone) {
        if (pointZone === 0) return false;
        if (pointZone === currentZone) return true;
        if (currentZone === 3) return true;
        if (currentZone === 2 && pointZone === 1) return true;
        return false;
      }

      calculateFitness(individual) {
        if (this.prevZoneParams) {
          if (individual.X <= this.prevZoneParams.X ||
            individual.R <= this.prevZoneParams.R) {
            return -1000;
          }
        }

        let pointScore = 0;
        let totalPoints = 0;

        this.allPoints.forEach(point => {
          const isInside = isPointInside(point.X, point.R, individual);
          const shouldBeInside = this.isZoneAllowed(point.Zone, this.currentZone);
          totalPoints++;
          if (isInside === shouldBeInside) {
            pointScore += 1;
          }
        });

        const pointClassificationScore = (pointScore / totalPoints) * 80;
        const area = calculateArea(individual);
        const maxPossibleArea = 100 * 100 * (Math.PI / 2);
        const areaScore = 20 * (1 - (area / maxPossibleArea));

        return pointClassificationScore + areaScore;
      }

      crossover(parent1, parent2) {
        const child = {};
        Object.keys(parent1).forEach(key => {
          // Skip A1 and A2 angles as they are fixed
          if (key !== 'a1Angle' && key !== 'a2Angle') {
            child[key] = round2Dec(Math.random() < 0.5 ? parent1[key] : parent2[key]);
          } else {
            child[key] = 30; // Fixed value
          }
        });
        return child;
      }

      mutate(individual) {
        const mutated = { ...individual };
        const minX = this.prevZoneParams ? this.prevZoneParams.X : 0;
        const minR = this.prevZoneParams ? this.prevZoneParams.R : 0;

        Object.keys(mutated).forEach(key => {
          // Skip A1 and A2 angles as they are fixed
          if (key !== 'a1Angle' && key !== 'a2Angle' && Math.random() < this.mutationRate) {
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

    let prevZoneParams = null;
    [1, 2, 3].forEach(zone => {
      console.log(`Optimizing zone ${zone}...`);

      const optimizer = new GeneticOptimizer(zone, data, prevZoneParams);
      const optimizedParams = optimizer.optimize();

      newZoneParams[zone] = {
        distCharAngle: round2Dec(Math.max(0, Math.min(90, optimizedParams.distCharAngle))),
        X: round2Dec(Math.max(prevZoneParams ? prevZoneParams.X + 0.1 : 0, Math.min(100, optimizedParams.X))),
        R: round2Dec(Math.max(prevZoneParams ? prevZoneParams.R + 0.1 : 0, Math.min(100, optimizedParams.R))),
        a1Angle: 30, // Fixed value
        a2Angle: 30, // Fixed value
        inclinationAngle: round2Dec(Math.max(0, Math.min(30, optimizedParams.inclinationAngle)))
      };

      prevZoneParams = newZoneParams[zone];
    });

    console.log('Final optimized parameters:', newZoneParams);

    // Update the parameters with animated transitions
    Object.keys(newZoneParams).forEach(zone => {
      Object.keys(newZoneParams[zone]).forEach(param => {
        const targetValue = newZoneParams[zone][param];
        const currentValue = zoneParams[zone][param];
        const steps = 30; // Number of steps for smooth transition
        const stepSize = (targetValue - currentValue) / steps;

        let startTime = null;
        const duration = 500; // Animation duration in milliseconds

        const animate = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const interpolatedValue = currentValue + (targetValue - currentValue) * progress;
          setZoneParams(prev => ({
            ...prev,
            [zone]: {
              ...prev[zone],
              [param]: round2Dec(interpolatedValue)
            }
          }));

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        requestAnimationFrame(animate);
      });
    });

    setError?.('');
  } catch (error) {
    console.error('Optimization error:', error);
    setError?.('Error optimizing parameters: ' + error.message);
  }
};