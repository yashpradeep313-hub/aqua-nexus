import { FittedModelResult, FittedModelPredictionPoint } from '../types';

/**
 * Pure JavaScript Matrix Operations & Ridge Regression Solver
 * Zero external dependencies.
 */

// Invert matrix using Gaussian elimination with partial pivoting
export function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length;
  // Create augmented matrix [A | I]
  const M: number[][] = A.map((row, i) => {
    const aug = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) aug[j] = row[j];
    aug[n + i] = 1;
    return aug;
  });

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxVal) {
        maxVal = Math.abs(M[k][i]);
        maxRow = k;
      }
    }

    if (maxVal < 1e-12) {
      return null; // Singular matrix
    }

    // Swap rows
    if (maxRow !== i) {
      const temp = M[i];
      M[i] = M[maxRow];
      M[maxRow] = temp;
    }

    // Scale pivot row
    const pivot = M[i][i];
    for (let j = 0; j < 2 * n; j++) {
      M[i][j] /= pivot;
    }

    // Eliminate other rows
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = 0; j < 2 * n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  // Extract right half
  const inv: number[][] = [];
  for (let i = 0; i < n; i++) {
    inv.push(M[i].slice(n));
  }
  return inv;
}

// Matrix transpose
export function transpose(A: number[][]): number[][] {
  if (A.length === 0) return [];
  const rows = A.length;
  const cols = A[0].length;
  const AT: number[][] = [];
  for (let j = 0; j < cols; j++) {
    const row: number[] = [];
    for (let i = 0; i < rows; i++) {
      row.push(A[i][j]);
    }
    AT.push(row);
  }
  return AT;
}

// Matrix multiplication A * B
export function multiplyMatrices(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const res: number[][] = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      res[i][j] = sum;
    }
  }
  return res;
}

// Solve Ridge Regression: (Z^T Z + lambda * I) * w = Z^T * y
export function solveRidge(
  Z: number[][],
  yCentered: number[],
  lambda: number = 1.0
): number[] {
  const P = Z[0].length;
  const ZT = transpose(Z);
  const ZTZ = multiplyMatrices(ZT, Z);

  // Add lambda * I
  for (let i = 0; i < P; i++) {
    ZTZ[i][i] += lambda;
  }

  const ZT_y: number[][] = Array.from({ length: P }, (_, i) => {
    let sum = 0;
    for (let k = 0; k < Z.length; k++) {
      sum += ZT[i][k] * yCentered[k];
    }
    return [sum];
  });

  const inv = invertMatrix(ZTZ);
  if (!inv) {
    // Fallback: gradient descent or zero weights
    return new Array(P).fill(0);
  }

  const wMat = multiplyMatrices(inv, ZT_y);
  return wMat.map(row => row[0]);
}

/**
 * Detects if any column indicates a chronological time sequence
 */
export function isChronologicalColumn(colName: string): boolean {
  const lower = colName.toLowerCase().trim();
  return (
    lower.includes('date') ||
    lower.includes('time') ||
    lower.includes('hour') ||
    lower.includes('timestamp') ||
    lower.includes('datetime') ||
    lower.includes('period') ||
    lower.includes('day') ||
    lower === 'h' ||
    lower === 't'
  );
}

/**
 * Fits a ridge regression on numeric table rows with standardized features.
 */
export function fitRidgeRegressionModel(
  city: string,
  tableName: string,
  columns: string[],
  rows: (number | string)[][],
  targetColumn: string,
  featureColumns: string[],
  lambda: number = 1.0
): FittedModelResult {
  const targetIdx = columns.indexOf(targetColumn);
  const featureIndices = featureColumns.map(col => columns.indexOf(col));

  if (targetIdx === -1 || featureIndices.some(idx => idx === -1)) {
    throw new Error('Target column or feature column was not found in table.');
  }

  // Filter valid rows where all features and target are numeric
  interface CleanRow {
    originalIndex: number;
    target: number;
    features: number[];
    timeLabel: string;
    naiveVal?: number;
  }

  const cleanRows: CleanRow[] = [];
  const timeColIdx = columns.findIndex(isChronologicalColumn);

  // Look for lag / naive baseline column if present
  const lagColIdx = columns.findIndex(col => {
    const l = col.toLowerCase();
    return l.includes('prev') || l.includes('last_week') || l.includes('lag') || l.includes('baseline');
  });

  rows.forEach((r, idx) => {
    const rawTarget = typeof r[targetIdx] === 'number' ? r[targetIdx] : parseFloat(String(r[targetIdx]).replace(/,/g, ''));
    if (isNaN(rawTarget as number) || rawTarget === null) return;

    const featureVals: number[] = [];
    let validFeatures = true;

    for (const fIdx of featureIndices) {
      const v = typeof r[fIdx] === 'number' ? r[fIdx] : parseFloat(String(r[fIdx]).replace(/,/g, ''));
      if (isNaN(v as number) || v === null) {
        validFeatures = false;
        break;
      }
      featureVals.push(v as number);
    }

    if (validFeatures) {
      const timeLabel = timeColIdx !== -1 && r[timeColIdx] !== undefined
        ? String(r[timeColIdx])
        : `Row ${idx + 1}`;

      let naiveVal: number | undefined = undefined;
      if (lagColIdx !== -1 && r[lagColIdx] !== undefined) {
        const lv = parseFloat(String(r[lagColIdx]));
        if (!isNaN(lv)) naiveVal = lv;
      }

      cleanRows.push({
        originalIndex: idx,
        target: rawTarget as number,
        features: featureVals,
        timeLabel,
        naiveVal
      });
    }
  });

  const N = cleanRows.length;
  if (N < 5) {
    throw new Error('Table must contain at least 5 valid numeric rows to fit a model.');
  }

  const P = featureColumns.length;
  const isChrono = timeColIdx !== -1;
  const splitType = isChrono ? 'Chronological 80/20' : '5-Fold Cross Validation';

  let warning: string | undefined = undefined;
  if (N < 50) {
    warning = 'Too little data for a reliable model (fewer than 50 rows). Results should be interpreted with caution.';
  }

  // Precompute global feature statistics for scaling
  const featureMeans: number[] = new Array(P).fill(0);
  const featureStds: number[] = new Array(P).fill(0);

  for (let j = 0; j < P; j++) {
    const sum = cleanRows.reduce((acc, row) => acc + row.features[j], 0);
    featureMeans[j] = sum / N;
    const variance = cleanRows.reduce((acc, row) => acc + Math.pow(row.features[j] - featureMeans[j], 2), 0) / N;
    featureStds[j] = Math.sqrt(variance) || 1e-6;
  }

  const targetMean = cleanRows.reduce((acc, r) => acc + r.target, 0) / N;

  // Function to standardize a feature vector
  const standardize = (x: number[]) => x.map((v, j) => (v - featureMeans[j]) / featureStds[j]);

  let allPredictions: { label: string; actual: number; predicted: number; naive: number; index: number }[] = [];
  let weights: number[] = [];
  let intercept = targetMean;

  if (isChrono) {
    // Chronological 80/20 split
    const trainCount = Math.floor(N * 0.8);
    const trainRows = cleanRows.slice(0, trainCount);
    const testRows = cleanRows.slice(trainCount);

    const trainYMean = trainRows.reduce((acc, r) => acc + r.target, 0) / trainCount;
    const Z_train = trainRows.map(r => standardize(r.features));
    const y_centered = trainRows.map(r => r.target - trainYMean);

    weights = solveRidge(Z_train, y_centered, lambda);

    // Compute unstandardized intercept
    let penaltyIntercept = 0;
    for (let j = 0; j < P; j++) {
      penaltyIntercept += (weights[j] * featureMeans[j]) / featureStds[j];
    }
    intercept = trainYMean - penaltyIntercept;

    // Evaluate on testRows
    testRows.forEach((row, i) => {
      let pred = intercept;
      for (let j = 0; j < P; j++) {
        pred += (weights[j] / featureStds[j]) * row.features[j];
      }
      pred = Math.max(0, pred);

      // Naive baseline: lag column if exists, otherwise previous row or mean
      let naive = row.naiveVal;
      if (naive === undefined) {
        if (i > 0) naive = testRows[i - 1].target;
        else naive = trainRows[trainRows.length - 1].target;
      }

      allPredictions.push({
        index: row.originalIndex,
        label: row.timeLabel,
        actual: Number(row.target.toFixed(2)),
        predicted: Number(pred.toFixed(2)),
        naive: Number(naive.toFixed(2))
      });
    });
  } else {
    // 5-Fold Cross Validation
    const K = 5;
    const foldSize = Math.floor(N / K);
    const oofPreds: { label: string; actual: number; predicted: number; naive: number; index: number }[] = [];

    // Also train on full dataset to get final production weights
    const Z_all = cleanRows.map(r => standardize(r.features));
    const y_all_centered = cleanRows.map(r => r.target - targetMean);
    weights = solveRidge(Z_all, y_all_centered, lambda);

    let penaltyIntercept = 0;
    for (let j = 0; j < P; j++) {
      penaltyIntercept += (weights[j] * featureMeans[j]) / featureStds[j];
    }
    intercept = targetMean - penaltyIntercept;

    for (let k = 0; k < K; k++) {
      const testStart = k * foldSize;
      const testEnd = k === K - 1 ? N : (k + 1) * foldSize;

      const trainFold = [...cleanRows.slice(0, testStart), ...cleanRows.slice(testEnd)];
      const testFold = cleanRows.slice(testStart, testEnd);

      const foldYMean = trainFold.reduce((acc, r) => acc + r.target, 0) / trainFold.length;
      const Z_fold = trainFold.map(r => standardize(r.features));
      const y_fold_centered = trainFold.map(r => r.target - foldYMean);

      const foldWeights = solveRidge(Z_fold, y_fold_centered, lambda);

      let foldPenalty = 0;
      for (let j = 0; j < P; j++) {
        foldPenalty += (foldWeights[j] * featureMeans[j]) / featureStds[j];
      }
      const foldIntercept = foldYMean - foldPenalty;

      testFold.forEach((row, i) => {
        let pred = foldIntercept;
        for (let j = 0; j < P; j++) {
          pred += (foldWeights[j] / featureStds[j]) * row.features[j];
        }
        pred = Math.max(0, pred);

        let naive = row.naiveVal;
        if (naive === undefined) {
          naive = i > 0 ? testFold[i - 1].target : foldYMean;
        }

        oofPreds.push({
          index: row.originalIndex,
          label: row.timeLabel,
          actual: Number(row.target.toFixed(2)),
          predicted: Number(pred.toFixed(2)),
          naive: Number(naive.toFixed(2))
        });
      });
    }

    allPredictions = oofPreds;
  }

  // Calculate Evaluation Metrics
  const sampleCount = allPredictions.length;
  const mae = allPredictions.reduce((acc, p) => acc + Math.abs(p.actual - p.predicted), 0) / sampleCount;
  const sumActual = allPredictions.reduce((acc, p) => acc + p.actual, 0) || 1;
  const wapePct = (allPredictions.reduce((acc, p) => acc + Math.abs(p.actual - p.predicted), 0) / sumActual) * 100;

  const naiveMae = allPredictions.reduce((acc, p) => acc + Math.abs(p.actual - p.naive), 0) / sampleCount;
  const naiveWapePct = (allPredictions.reduce((acc, p) => acc + Math.abs(p.actual - p.naive), 0) / sumActual) * 100;

  const maeImprovementPct = naiveMae > 0
    ? ((naiveMae - mae) / naiveMae) * 100
    : 0;

  // R2 Score
  const meanEval = sumActual / sampleCount;
  const ssTot = allPredictions.reduce((acc, p) => acc + Math.pow(p.actual - meanEval, 2), 0) || 1;
  const ssRes = allPredictions.reduce((acc, p) => acc + Math.pow(p.actual - p.predicted, 2), 0);
  const r2Score = Math.max(-1, 1 - (ssRes / ssTot));

  // Format weights
  const featureWeights = featureColumns.map((col, idx) => ({
    feature: col,
    coefficient: Number((weights[idx] / featureStds[idx]).toFixed(4)),
    stdWeight: Number(weights[idx].toFixed(4))
  }));

  // Limit visual chart points to max 60 evenly sampled points
  const step = Math.max(1, Math.floor(allPredictions.length / 50));
  const chartPoints: FittedModelPredictionPoint[] = allPredictions
    .filter((_, i) => i % step === 0)
    .slice(0, 50);

  return {
    city,
    tableName,
    targetColumn,
    featureColumns,
    splitType,
    rowCount: N,
    fittedAt: new Date().toISOString(),
    weights: featureWeights,
    intercept: Number(intercept.toFixed(4)),
    mae: Number(mae.toFixed(3)),
    wapePct: Number(wapePct.toFixed(2)),
    naiveBaselineMae: Number(naiveMae.toFixed(3)),
    naiveBaselineWapePct: Number(naiveWapePct.toFixed(2)),
    maeImprovementPct: Number(maeImprovementPct.toFixed(2)),
    predictedVsActual: chartPoints,
    warning,
    r2Score: Number(r2Score.toFixed(3))
  };
}
