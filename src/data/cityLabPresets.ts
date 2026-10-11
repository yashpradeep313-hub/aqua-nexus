import { CityProfile } from '../types';

export const BUILTIN_KAGGLE_PROFILE: CityProfile = {
  id: 'profile-kaggle-default',
  cityName: 'Current Project (Kaggle dm1718 + demo zones)',
  sourceType: 'default',
  confirmed: true,
  uploadedAt: '2026-10-10T08:00:00Z',
  tables: [
    {
      name: 'Bengaluru Water Utility Zone Telemetry',
      columns: ['zone_id', 'zone_name', 'population', 'critical_facilities', 'priority_weight', 'current_supply_ml', 'min_guarantee_ml'],
      rows: [
        ['Z1', 'Metro Core', 420000, 24, 5, 12.0, 4.5],
        ['Z2', 'East Valley', 380000, 14, 4, 10.5, 3.8],
        ['Z3', 'North Hills', 290000, 8, 3, 8.5, 2.5],
        ['Z4', 'South Reservoir', 220000, 6, 2, 7.5, 2.0],
        ['Z5', 'West Industrial', 185000, 5, 2, 7.5, 1.8]
      ],
      unit: 'Megalitres (ML) / Day',
      page: 1
    }
  ],
  policy: {
    priority_order: ['Hospitals & Healthcare Facilities', 'High-Density Residential', 'Commercial Hubs', 'Industrial Estates'],
    minimum_guarantee: [
      { sector: 'Hospitals & Emergency Facilities', value: 4.5, unit: 'ML/day', page: 1 },
      { sector: 'Residential Baseline Lifeline', value: 3.8, unit: 'ML/day', page: 1 }
    ],
    per_capita_norm_lpcd: 135,
    network_loss_percent: 18.2,
    rationing_rules: [
      'Protect Priority 5 healthcare zones at 100% allocation during peak deficits',
      'Deficit burden distributed proportionally across lower-priority residential & commercial zones'
    ],
    supply_hours: '24/7 continuous pressurized'
  },
  notes: [
    'Default operational baseline utilizing Kaggle dm1718 hourly consumption series and 5-zone hydraulic topology.'
  ],
  completenessPct: 100
};

// Realistic synthetic dataset generator for Singapore
function generateSingaporeHourlyData(): (number | string)[][] {
  const rows: (number | string)[][] = [];
  const baseDemands = [8.2, 7.6, 7.1, 6.9, 7.4, 8.8, 11.2, 13.5, 14.8, 15.2, 14.9, 14.6, 14.4, 14.8, 15.1, 15.4, 15.8, 16.2, 15.5, 14.2, 12.8, 11.4, 9.8, 8.7];

  for (let day = 0; day < 5; day++) {
    for (let h = 0; h < 24; h++) {
      const hourIndex = day * 24 + h;
      const hourStr = `2026-10-${String(10 + day).padStart(2, '0')} ${String(h).padStart(2, '0')}:00`;
      const temp = Number((28.5 + 4.2 * Math.sin((h - 8) / 12 * Math.PI) + (Math.sin(day * 1.5) * 0.8)).toFixed(1));
      const humidity = Number((88 - (temp - 28) * 4.5 + Math.random() * 2).toFixed(1));
      const industrialFabLoad = Number((82 + 12 * Math.sin((h - 6) / 12 * Math.PI) + (day < 4 ? 4 : -6)).toFixed(1));
      const prevHourDemand = h === 0 && day === 0 ? 8.5 : baseDemands[(h + 23) % 24];
      const demand = Number((baseDemands[h] * 0.7 + (industrialFabLoad / 100) * 3.8 + (temp - 28) * 0.22 + (Math.sin(hourIndex * 0.3) * 0.3)).toFixed(2));

      rows.push([hourStr, temp, humidity, industrialFabLoad, prevHourDemand, demand]);
    }
  }
  return rows;
}

export const PRESET_SINGAPORE_PUB: CityProfile = {
  id: 'preset-singapore-pub',
  cityName: 'Singapore PUB Water Master Plan',
  sourceType: 'preset',
  confirmed: true,
  uploadedAt: new Date().toISOString(),
  tables: [
    {
      name: 'Jurong & Tuas Industrial Water Consumption Series',
      columns: ['timestamp', 'ambient_temp_c', 'humidity_pct', 'fab_load_pct', 'prev_hour_ml', 'water_consumption_ml'],
      rows: generateSingaporeHourlyData(),
      unit: 'Hourly Megalitres (ML)',
      page: 14
    },
    {
      name: 'National Water Tap Distribution Matrix',
      columns: ['water_source', 'daily_capacity_mgd', 'pct_of_total_demand', 'energy_intensity_kwh_m3'],
      rows: [
        ['NEWater (High-Grade Recycled)', 170, 40, 0.9],
        ['Desalinated Seawater', 130, 30, 3.5],
        ['Local Catchment Reservoirs', 85, 20, 0.2],
        ['Imported Raw Water', 45, 10, 0.4]
      ],
      unit: 'Million Gallons / Day (MGD)',
      page: 8
    }
  ],
  policy: {
    priority_order: [
      'Wafer Fab & Semiconductor Advanced Manufacturing',
      'Public Healthcare & Critical Quarantine Centers',
      'Domestic Potable Tap Supply',
      'Commercial & Retail Hubs'
    ],
    minimum_guarantee: [
      { sector: 'Advanced Semiconductor Fab Estates', value: 4.8, unit: 'ML/day', page: 22 },
      { sector: 'Public Healthcare Infrastructure', value: 3.5, unit: 'ML/day', page: 24 }
    ],
    per_capita_norm_lpcd: 141,
    network_loss_percent: 5.0,
    rationing_rules: [
      'Mandatory substitution of potable water with NEWater for all cooling towers exceeding 500 RT capacity',
      'Industrial circularity target: Minimum 30% on-site water recycling enforced for heavy manufacturers',
      'Smart AMI acoustic leak detection deployed network-wide to cap non-revenue water at 5.0%'
    ],
    supply_hours: '24/7 continuous pressurized'
  },
  notes: [
    'Benchmark plan prioritizing high-tech semiconductor fabs and ultra-pure NEWater reclamation with world-leading 5% transmission losses.'
  ],
  completenessPct: 95
};

// Realistic synthetic dataset generator for Cape Town Day Zero plan
function generateCapeTownHourlyData(): (number | string)[][] {
  const rows: (number | string)[][] = [];
  const baseProfile = [3.2, 2.8, 2.6, 2.5, 3.1, 7.8, 9.4, 8.2, 5.1, 4.8, 4.6, 4.7, 4.5, 4.8, 5.2, 6.1, 8.9, 9.2, 7.5, 5.8, 4.6, 3.9, 3.5, 3.2];

  for (let day = 0; day < 4; day++) {
    for (let h = 0; h < 24; h++) {
      const hourStr = `2026-10-${String(10 + day).padStart(2, '0')} ${String(h).padStart(2, '0')}:00`;
      const temp = Number((16.0 + 8.5 * Math.sin((h - 9) / 12 * Math.PI) + Math.random() * 0.8).toFixed(1));
      const pressureBar = Number((h >= 6 && h <= 10 ? 2.6 : 1.1 + (Math.sin(h * 0.2) * 0.2)).toFixed(2));
      const rationingWindowActive = h >= 6 && h <= 10 ? 1 : 0;
      const prevHour = h === 0 && day === 0 ? 3.4 : baseProfile[(h + 23) % 24];
      const consumption = Number((baseProfile[h] * (rationingWindowActive ? 1.1 : 0.65) + (temp - 20) * 0.12).toFixed(2));

      rows.push([hourStr, temp, pressureBar, rationingWindowActive, prevHour, consumption]);
    }
  }
  return rows;
}

export const PRESET_CAPE_TOWN_DAY_ZERO: CityProfile = {
  id: 'preset-cape-town-dayzero',
  cityName: 'Cape Town Day Zero Plan',
  sourceType: 'preset',
  confirmed: true,
  uploadedAt: new Date().toISOString(),
  tables: [
    {
      name: 'Rationed Zone Pressure & Inflow Registry',
      columns: ['timestamp', 'ambient_temp_c', 'trunk_pressure_bar', 'rationing_window_active', 'prev_hour_ml', 'hourly_inflow_ml'],
      rows: generateCapeTownHourlyData(),
      unit: 'Hourly Megalitres (ML)',
      page: 11
    },
    {
      name: 'Emergency Communal Collection Points Quotas',
      columns: ['pod_id', 'district', 'design_capacity_ppd', 'allocated_ml_day', 'queue_limit_minutes'],
      rows: [
        ['POD-01', 'City Bowl Central', 25000, 1.25, 45],
        ['POD-02', 'Khayelitsha Primary', 48000, 2.40, 60],
        ['POD-03', 'Mitchells Plain', 38000, 1.90, 50],
        ['POD-04', 'Tygerberg Medical', 22000, 1.10, 30]
      ],
      unit: 'Megallitres / Day',
      page: 17
    }
  ],
  policy: {
    priority_order: [
      'Hospitals, Clinics & Trauma Centers',
      'Communal Potable Water Collection Points (PODs)',
      'High-Density Informal Settlements',
      'Essential Commercial Food Distribution'
    ],
    minimum_guarantee: [
      { sector: 'Trauma Centers & Hospitals', value: 2.8, unit: 'ML/day', page: 6 },
      { sector: 'Emergency Communal PODs', value: 8.5, unit: 'ML/day', page: 9 }
    ],
    per_capita_norm_lpcd: 50,
    network_loss_percent: 16.5,
    rationing_rules: [
      'Stage 6 Water Shedding: Reticulation trunk pressure reduced to 1.1 bar outside 4-hour morning supply window (06:00 - 10:00)',
      'Strict residential allocation cap of 50 Litres Per Capita per Day (lpcd)',
      'Immediate physical shut-off of non-essential municipal connections, public swimming pools, ornamental fountains and sports grounds'
    ],
    supply_hours: '06:00 - 10:00 (4 hours/day during level 6 emergency)'
  },
  notes: [
    'Emergency crisis contingency plan designed during historic severe drought with 50 lpcd cap and 4-hour pressurized distribution windows.'
  ],
  completenessPct: 92
};

// 1. Lakeview Water Policy (sample_lakeview_water_policy (2).pdf)
export const PRESET_LAKEVIEW_POLICY: CityProfile = {
  id: 'preset-lakeview-policy',
  cityName: 'Lakeview Municipal Water Policy',
  sourceType: 'pdf',
  sourceFilename: 'sample_lakeview_water_policy (2).pdf',
  confirmed: true,
  uploadedAt: new Date().toISOString(),
  tables: [
    {
      name: 'Lakeview Municipal Sector Allocation Baseline',
      columns: ['sector_name', 'priority_rank', 'daily_quota_ml', 'min_guarantee_ml', 'page_ref'],
      rows: [
        ['Regional Medical Center & Trauma', 1, 3.2, 3.0, 1],
        ['Municipal Drinking Water Network', 2, 14.5, 9.8, 1],
        ['Household & Residential Blocks', 3, 11.0, 7.2, 1],
        ['Lakeview Commercial & Tourism District', 4, 6.4, 2.5, 2],
        ['North Lakeview Industrial Park', 5, 5.8, 1.8, 2]
      ],
      unit: 'Megalitres (ML) / Day',
      page: 1
    }
  ],
  policy: {
    priority_order: [
      'Regional Medical Center & Trauma',
      'Municipal Drinking Water Network',
      'Household & Residential Blocks',
      'Lakeview Commercial & Tourism District',
      'North Lakeview Industrial Park'
    ],
    minimum_guarantee: [
      { sector: 'Regional Medical Center & Trauma', value: 3.0, unit: 'ML/day', page: 1 },
      { sector: 'Municipal Drinking Water Network', value: 9.8, unit: 'ML/day', page: 1 },
      { sector: 'Household & Residential Blocks', value: 7.2, unit: 'ML/day', page: 1 },
      { sector: 'North Lakeview Industrial Park', value: 1.8, unit: 'ML/day', page: 2 }
    ],
    per_capita_norm_lpcd: 120,
    network_loss_percent: 12.4,
    rationing_rules: [
      'During Stage 2 Drought: Commercial tourism and hotel allocations reduced by up to 40% before any residential throttling',
      'Critical healthcare facilities (Regional Medical Center) are exempted from rotational shedding and guaranteed 100% supply',
      'Pressure management reduces trunk line pressure from 3.2 bar to 1.8 bar between 22:00 and 05:00 to reduce leakage'
    ],
    supply_hours: '24/7 continuous pressurized (with nighttime low-pressure regime)'
  },
  notes: [
    'Extracted from City of Lakeview Municipal Water Authority Master Strategy. Verified priority hierarchy protects trauma healthcare and drinking water.'
  ],
  completenessPct: 100
};

// 2. Lakeview Hourly Consumption (sample_lakeview_hourly_consumption (1).pdf)
function generateLakeviewHourlySeries(): (number | string)[][] {
  const rows: (number | string)[][] = [];
  // 72 hours of telemetry (3 full days) with date/time, ambient temp, rainfall, pressure, pump speed, prev_hour_lag, water_consumption
  const baseProfile = [
    5.4, 4.8, 4.2, 4.0, 4.6, 6.8, 9.4, 11.2, 11.8, 11.5, 11.0, 10.8,
    10.5, 10.9, 11.4, 11.8, 12.6, 13.2, 12.8, 11.6, 10.2, 8.8, 7.4, 6.2
  ];

  for (let day = 0; day < 3; day++) {
    for (let h = 0; h < 24; h++) {
      const hourStr = `2026-10-${String(10 + day).padStart(2, '0')} ${String(h).padStart(2, '0')}:00`;
      const temp = Number((21.0 + 7.5 * Math.sin((h - 8) / 12 * Math.PI) + (day === 1 ? 1.2 : -0.5)).toFixed(1));
      const rainfallMm = Number((h === 14 && day === 1 ? 3.8 : h === 15 && day === 1 ? 2.1 : 0.0).toFixed(1));
      const pressureBar = Number((3.1 - 0.4 * Math.sin((h - 6) / 12 * Math.PI)).toFixed(2));
      const pumpRpm = Math.round(1450 + 320 * Math.sin((h - 7) / 12 * Math.PI));
      const prevHour = h === 0 && day === 0 ? 5.8 : baseProfile[(h + 23) % 24];
      const demand = Number((baseProfile[h] + (temp - 21) * 0.18 - rainfallMm * 0.4 + (pumpRpm - 1450) * 0.002).toFixed(2));

      rows.push([hourStr, temp, rainfallMm, pressureBar, pumpRpm, prevHour, demand]);
    }
  }
  return rows;
}

export const PRESET_LAKEVIEW_CONSUMPTION: CityProfile = {
  id: 'preset-lakeview-consumption',
  cityName: 'Lakeview District Hourly Consumption Series',
  sourceType: 'pdf',
  sourceFilename: 'sample_lakeview_hourly_consumption (1).pdf',
  confirmed: true,
  uploadedAt: new Date().toISOString(),
  tables: [
    {
      name: 'Lakeview District AMI Hourly Flow Telemetry (72h)',
      columns: ['timestamp', 'ambient_temp_c', 'rainfall_mm', 'trunk_pressure_bar', 'pump_rpm', 'prev_hour_lag_ml', 'water_consumption_ml'],
      rows: generateLakeviewHourlySeries(),
      unit: 'Hourly Megalitres (ML)',
      page: 1
    }
  ],
  policy: {
    priority_order: ['Hospitals & Emergency', 'High-Density Residential', 'Commercial Sector', 'Industrial Zone'],
    minimum_guarantee: [
      { sector: 'Emergency Facilities', value: 2.5, unit: 'ML/day', page: 2 }
    ],
    per_capita_norm_lpcd: 125,
    network_loss_percent: 11.8,
    rationing_rules: [
      'SCADA automatic pump modulation based on pressure feedback to minimize hydraulic surges'
    ],
    supply_hours: '24/7 continuous pressurized'
  },
  notes: [
    'Chronological 72-hour AMI hourly telemetry suitable for 80/20 chronological Ridge regression with naive baseline comparison.'
  ],
  completenessPct: 90
};

// 3. Riverton Zone Profile (sample_riverton_zone_profile.pdf)
export const PRESET_RIVERTON_PROFILE: CityProfile = {
  id: 'preset-riverton-profile',
  cityName: 'Riverton Municipal Water Authority',
  sourceType: 'pdf',
  sourceFilename: 'sample_riverton_zone_profile.pdf',
  confirmed: true,
  uploadedAt: new Date().toISOString(),
  tables: [
    {
      name: 'Riverton Multi-Sector Ward Allocations',
      columns: ['ward_code', 'ward_name', 'population', 'critical_facilities', 'daily_demand_ml', 'min_floor_ml'],
      rows: [
        ['W101', 'Riverton Old Town & Central Clinic', 310000, 18, 9.8, 4.2],
        ['W102', 'Riverton Tech Corridor', 195000, 7, 7.4, 2.5],
        ['W103', 'North Heights Residential', 240000, 9, 6.8, 2.1],
        ['W104', 'River Port & Freight Hub', 120000, 4, 5.2, 1.4],
        ['W105', 'South Agricultural Fringe', 85000, 2, 4.5, 0.9]
      ],
      unit: 'Megalitres (ML) / Day',
      page: 2
    }
  ],
  policy: {
    priority_order: [
      'Central Hospital & Primary Clinics',
      'Municipal Domestic Potable Lifeline',
      'Tech Corridor & Light Assembly',
      'Commercial Riverfront',
      'Agricultural Fringe Irrigation'
    ],
    minimum_guarantee: [
      { sector: 'Central Hospital & Primary Clinics', value: 4.2, unit: 'ML/day', page: 1 },
      { sector: 'Municipal Domestic Potable Lifeline', value: 8.5, unit: 'ML/day', page: 2 },
      { sector: 'Tech Corridor & Light Assembly', value: 2.5, unit: 'ML/day', page: 3 }
    ],
    per_capita_norm_lpcd: 110,
    network_loss_percent: 15.6,
    rationing_rules: [
      'In drought status Alert-B, non-potable agricultural allocations reduced by 50%',
      'Riverton Old Town medical facilities receive uninterrupted prioritized gravity-feed flow from elevated storage'
    ],
    supply_hours: '18 hours/day (05:00 - 23:00)'
  },
  notes: [
    'Riverton Water Authority master zoning profile with 5 primary wards and distinct priority weighting.'
  ],
  completenessPct: 95
};

// 4. Edge Case Small Messy Table (sample_edge_case_small_messy.pdf)
// Fewer than 50 rows, contains dashes, empty values, tests system honesty & handling
function generateMessySmallTable(): (number | string)[][] {
  return [
    ['2026-10-01', 22.4, 1.2, 4.8, 5.1],
    ['2026-10-02', 23.1, 0.0, 4.6, 5.3],
    ['2026-10-03', 21.8, 14.5, 4.2, 4.7],
    ['2026-10-04', 24.5, 0.0, 5.0, 5.6],
    ['2026-10-05', 26.2, 0.0, 5.3, 5.9],
    ['2026-10-06', 25.8, '-', 5.1, 5.8], // contains dash (missing)
    ['2026-10-07', 23.9, 3.4, 4.7, 5.2],
    ['2026-10-08', 21.5, 8.2, 4.1, 4.5],
    ['2026-10-09', 22.0, 0.0, 4.3, 4.8],
    ['2026-10-10', 24.1, 0.0, 4.9, 5.4],
    ['2026-10-11', 25.3, 0.0, 5.2, 5.7],
    ['2026-10-12', 'N/A', 0.0, 4.8, 5.0], // contains N/A (missing)
    ['2026-10-13', 23.7, 1.1, 4.5, 5.1],
    ['2026-10-14', 22.9, 0.5, 4.4, 4.9],
    ['2026-10-15', 24.8, 0.0, 5.0, 5.5],
    ['2026-10-16', 26.5, 0.0, 5.4, 6.1],
    ['2026-10-17', 25.0, 2.8, 4.9, 5.4],
    ['2026-10-18', 21.2, 11.0, 4.0, 4.4],
    ['2026-10-19', 22.8, 0.0, 4.6, 5.0],
    ['2026-10-20', 23.5, 0.0, 4.7, 5.2],
    ['2026-10-21', 24.9, 0.0, 5.1, 5.6],
    ['2026-10-22', 25.1, '-', 5.0, 5.5],
    ['2026-10-23', 22.6, 4.5, 4.3, 4.8],
    ['2026-10-24', 23.0, 0.0, 4.5, 5.0]
  ];
}

export const PRESET_EDGE_CASE_MESSY: CityProfile = {
  id: 'preset-edge-case-small-messy',
  cityName: 'Alpine Valley (Small & Messy Edge Case)',
  sourceType: 'pdf',
  sourceFilename: 'sample_edge_case_small_messy.pdf',
  confirmed: true,
  uploadedAt: new Date().toISOString(),
  tables: [
    {
      name: 'Alpine Sub-Catchment Inflow (24 Rows with Missing Values)',
      columns: ['date', 'avg_temp_c', 'precipitation_mm', 'prev_day_mld', 'total_consumption_mld'],
      rows: generateMessySmallTable(),
      unit: 'Daily Megalitres (MLD)',
      page: 1
    }
  ],
  policy: {
    priority_order: [
      'Mountain Village Health Post',
      'Residential Potable Network',
      'Ski Resort Snowmaking'
    ],
    minimum_guarantee: [
      { sector: 'Mountain Village Health Post', value: 0.8, unit: 'ML/day', page: 1 }
    ],
    per_capita_norm_lpcd: 95,
    network_loss_percent: 21.5,
    rationing_rules: [
      'Small municipality edge case test plan',
      'Only 24 rows available: triggers "< 50 rows" reliability warning during regression fit'
    ],
    supply_hours: '12 hours/day (06:00 - 18:00)'
  },
  notes: [
    'Edge case document with 24 rows, missing values ("-", "N/A"), testing robustness of regression sanitizer and reliability warning triggers.'
  ],
  completenessPct: 75
};
