/**
 * Optimization Engine
 * Grid search and genetic algorithm optimization
 */

import {
  OptimizationConfig,
  OptimizationResult,
  OptimizationParameter,
  BacktestConfig,
  BacktestResult,
  PerformanceMetrics,
} from '@/types/backtesting';
import { BacktestEngine } from './backtest-engine';
import { BarData } from '@/types/backtesting';

export class OptimizationEngine {
  private cancelled = false;

  /**
   * Run optimization
   */
  async optimize(
    data: BarData[],
    baseConfig: BacktestConfig,
    optimizationConfig: OptimizationConfig,
    onProgress?: (progress: number) => void
  ): Promise<OptimizationResult> {
    this.cancelled = false;

    switch (optimizationConfig.method) {
      case 'GRID':
        return this.gridSearch(data, baseConfig, optimizationConfig, onProgress);
      case 'GENETIC':
        return this.geneticAlgorithm(data, baseConfig, optimizationConfig, onProgress);
      case 'WALK_FORWARD':
        return this.walkForwardAnalysis(data, baseConfig, optimizationConfig, onProgress);
      default:
        throw new Error(`Unsupported optimization method: ${optimizationConfig.method}`);
    }
  }

  /**
   * Grid search optimization
   */
  private async gridSearch(
    data: BarData[],
    baseConfig: BacktestConfig,
    optimizationConfig: OptimizationConfig,
    onProgress?: (progress: number) => void
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const parameterCombinations = this.generateParameterCombinations(optimizationConfig.parameters);
    const totalRuns = parameterCombinations.length;
    
    const results: Array<{
      parameters: Record<string, number>;
      objective: number;
      metrics: PerformanceMetrics;
    }> = [];

    const engine = new BacktestEngine();
    let bestResult: BacktestResult | null = null;
    let bestObjective = optimizationConfig.maximize ? -Infinity : Infinity;
    let bestParameters: Record<string, number> = {};

    for (let i = 0; i < parameterCombinations.length; i++) {
      if (this.cancelled) break;

      const params = parameterCombinations[i];
      
      // Update strategy parameters
      const config = this.updateConfigWithParameters(baseConfig, params);
      
      // Run backtest
      const result = await engine.runBacktest(data, config);
      
      if (result.status === 'COMPLETED') {
        const objective = result.metrics[optimizationConfig.objective] as number;
        
        // Apply constraints
        if (this.meetsConstraints(result, optimizationConfig)) {
          results.push({
            parameters: params,
            objective,
            metrics: result.metrics,
          });

          // Update best result
          const isBetter = optimizationConfig.maximize
            ? objective > bestObjective
            : objective < bestObjective;

          if (isBetter) {
            bestObjective = objective;
            bestResult = result;
            bestParameters = params;
          }
        }
      }

      // Report progress
      if (onProgress) {
        onProgress((i + 1) / totalRuns * 100);
      }
    }

    const executionTime = Date.now() - startTime;

    if (!bestResult) {
      throw new Error('No valid results found');
    }

    return {
      id: `opt_${Date.now()}`,
      method: 'GRID',
      totalRuns,
      completedRuns: results.length,
      bestResult,
      bestParameters,
      allResults: results.sort((a, b) => 
        optimizationConfig.maximize ? b.objective - a.objective : a.objective - b.objective
      ),
      executionTime,
      status: 'COMPLETED',
      progress: 100,
    };
  }

  /**
   * Genetic algorithm optimization
   */
  private async geneticAlgorithm(
    data: BarData[],
    baseConfig: BacktestConfig,
    optimizationConfig: OptimizationConfig,
    onProgress?: (progress: number) => void
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const populationSize = optimizationConfig.populationSize || 50;
    const generations = optimizationConfig.generations || 20;
    const mutationRate = optimizationConfig.mutationRate || 0.1;
    const crossoverRate = optimizationConfig.crossoverRate || 0.7;

    const engine = new BacktestEngine();
    
    // Initialize population
    let population = this.initializePopulation(optimizationConfig.parameters, populationSize);
    
    const allResults: Array<{
      parameters: Record<string, number>;
      objective: number;
      metrics: PerformanceMetrics;
    }> = [];

    let bestResult: BacktestResult | null = null;
    let bestObjective = optimizationConfig.maximize ? -Infinity : Infinity;
    let bestParameters: Record<string, number> = {};

    for (let gen = 0; gen < generations; gen++) {
      if (this.cancelled) break;

      // Evaluate population
      const evaluatedPop: Array<{
        params: Record<string, number>;
        fitness: number;
        result: BacktestResult;
      }> = [];

      for (const params of population) {
        const config = this.updateConfigWithParameters(baseConfig, params);
        const result = await engine.runBacktest(data, config);

        if (result.status === 'COMPLETED' && this.meetsConstraints(result, optimizationConfig)) {
          const fitness = result.metrics[optimizationConfig.objective] as number;
          evaluatedPop.push({ params, fitness, result });

          allResults.push({
            parameters: params,
            objective: fitness,
            metrics: result.metrics,
          });

          const isBetter = optimizationConfig.maximize
            ? fitness > bestObjective
            : fitness < bestObjective;

          if (isBetter) {
            bestObjective = fitness;
            bestResult = result;
            bestParameters = params;
          }
        }
      }

      // Selection and reproduction
      population = this.evolvePopulation(
        evaluatedPop,
        optimizationConfig.parameters,
        populationSize,
        mutationRate,
        crossoverRate,
        optimizationConfig.maximize
      );

      // Report progress
      if (onProgress) {
        onProgress((gen + 1) / generations * 100);
      }
    }

    const executionTime = Date.now() - startTime;

    if (!bestResult) {
      throw new Error('No valid results found');
    }

    return {
      id: `opt_${Date.now()}`,
      method: 'GENETIC',
      totalRuns: populationSize * generations,
      completedRuns: allResults.length,
      bestResult,
      bestParameters,
      allResults: allResults.sort((a, b) => 
        optimizationConfig.maximize ? b.objective - a.objective : a.objective - b.objective
      ),
      executionTime,
      status: 'COMPLETED',
      progress: 100,
    };
  }

  /**
   * Walk-forward analysis
   */
  private async walkForwardAnalysis(
    data: BarData[],
    baseConfig: BacktestConfig,
    optimizationConfig: OptimizationConfig,
    onProgress?: (progress: number) => void
  ): Promise<OptimizationResult> {
    // Implementation would split data into training/testing windows
    // For now, return a simple implementation
    const gridResult = await this.gridSearch(data, baseConfig, optimizationConfig, onProgress);
    
    return {
      ...gridResult,
      method: 'WALK_FORWARD',
    };
  }

  /**
   * Generate parameter combinations for grid search
   */
  private generateParameterCombinations(
    parameters: OptimizationParameter[]
  ): Record<string, number>[] {
    if (parameters.length === 0) return [{}];

    const [first, ...rest] = parameters;
    const restCombinations = this.generateParameterCombinations(rest);
    const combinations: Record<string, number>[] = [];

    for (let value = first.min; value <= first.max; value += first.step) {
      for (const restCombo of restCombinations) {
        combinations.push({
          [first.name]: first.type === 'INTEGER' ? Math.round(value) : value,
          ...restCombo,
        });
      }
    }

    return combinations;
  }

  /**
   * Initialize random population for genetic algorithm
   */
  private initializePopulation(
    parameters: OptimizationParameter[],
    size: number
  ): Record<string, number>[] {
    const population: Record<string, number>[] = [];

    for (let i = 0; i < size; i++) {
      const individual: Record<string, number> = {};
      
      for (const param of parameters) {
        const range = param.max - param.min;
        const value = param.min + Math.random() * range;
        individual[param.name] = param.type === 'INTEGER' ? Math.round(value) : value;
      }
      
      population.push(individual);
    }

    return population;
  }

  /**
   * Evolve population using selection, crossover, and mutation
   */
  private evolvePopulation(
    evaluatedPop: Array<{ params: Record<string, number>; fitness: number }>,
    parameters: OptimizationParameter[],
    size: number,
    mutationRate: number,
    crossoverRate: number,
    maximize: boolean
  ): Record<string, number>[] {
    // Sort by fitness
    const sorted = [...evaluatedPop].sort((a, b) => 
      maximize ? b.fitness - a.fitness : a.fitness - b.fitness
    );

    const newPopulation: Record<string, number>[] = [];

    // Elitism - keep top 10%
    const eliteCount = Math.floor(size * 0.1);
    for (let i = 0; i < eliteCount && i < sorted.length; i++) {
      newPopulation.push(sorted[i].params);
    }

    // Generate rest through crossover and mutation
    while (newPopulation.length < size) {
      const parent1 = this.tournamentSelection(sorted, maximize);
      const parent2 = this.tournamentSelection(sorted, maximize);

      let child: Record<string, number>;
      
      if (Math.random() < crossoverRate) {
        child = this.crossover(parent1, parent2);
      } else {
        child = { ...parent1 };
      }

      if (Math.random() < mutationRate) {
        child = this.mutate(child, parameters);
      }

      newPopulation.push(child);
    }

    return newPopulation;
  }

  /**
   * Tournament selection
   */
  private tournamentSelection(
    population: Array<{ params: Record<string, number>; fitness: number }>,
    maximize: boolean,
    tournamentSize = 3
  ): Record<string, number> {
    const tournament: typeof population = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]);
    }

    const best = tournament.reduce((best, current) => {
      const isBetter = maximize ? current.fitness > best.fitness : current.fitness < best.fitness;
      return isBetter ? current : best;
    });

    return best.params;
  }

  /**
   * Crossover two parents
   */
  private crossover(
    parent1: Record<string, number>,
    parent2: Record<string, number>
  ): Record<string, number> {
    const child: Record<string, number> = {};
    const keys = Object.keys(parent1);

    for (const key of keys) {
      child[key] = Math.random() < 0.5 ? parent1[key] : parent2[key];
    }

    return child;
  }

  /**
   * Mutate parameters
   */
  private mutate(
    params: Record<string, number>,
    parameters: OptimizationParameter[]
  ): Record<string, number> {
    const mutated = { ...params };
    const paramToMutate = parameters[Math.floor(Math.random() * parameters.length)];

    const range = paramToMutate.max - paramToMutate.min;
    const mutation = (Math.random() - 0.5) * range * 0.2; // 20% of range
    
    let newValue = mutated[paramToMutate.name] + mutation;
    newValue = Math.max(paramToMutate.min, Math.min(paramToMutate.max, newValue));
    
    mutated[paramToMutate.name] = paramToMutate.type === 'INTEGER' 
      ? Math.round(newValue) 
      : newValue;

    return mutated;
  }

  /**
   * Update config with optimized parameters
   */
  private updateConfigWithParameters(
    baseConfig: BacktestConfig,
    parameters: Record<string, number>
  ): BacktestConfig {
    const config = { ...baseConfig };
    
    // Update strategy parameters
    config.strategy = {
      ...config.strategy,
      parameters: config.strategy.parameters.map(param => ({
        ...param,
        value: parameters[param.name] !== undefined ? parameters[param.name] : param.value,
      })),
    };

    return config;
  }

  /**
   * Check if result meets constraints
   */
  private meetsConstraints(result: BacktestResult, config: OptimizationConfig): boolean {
    if (config.minTrades && result.metrics.totalTrades < config.minTrades) {
      return false;
    }

    if (config.maxDrawdown && result.metrics.maxDrawdownPercent > config.maxDrawdown) {
      return false;
    }

    if (config.minSharpe && result.metrics.sharpeRatio < config.minSharpe) {
      return false;
    }

    return true;
  }

  /**
   * Cancel optimization
   */
  cancel(): void {
    this.cancelled = true;
  }
}
