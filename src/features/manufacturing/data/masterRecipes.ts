import { Recipe } from '../models/manufacturing';
import { StagedRecipe } from '../../inventory/services/inventoryStaging';

const NOW = '2026-01-01T00:00:00.000Z';

/**
 * 14 Approved Talk of the Town Master Recipes mapped directly to TOT-001..TOT-144 inventory IDs.
 * Base quantities represent 1 Medium/Standard portion (yieldQuantity = 1).
 * Portion scaling in POS: Small = 0.65x, Medium = 1.0x, Large = 1.35x, Standard = 1.0x.
 */
export const MASTER_RECIPES: Recipe[] = [
  {
    id: 'rec_chow_veg',
    name: 'Veg Chowmein',
    description: 'Wok-tossed noodles with shredded cabbage, carrot, capsicum, beans, and house aromatics.',
    categoryId: 'Chowmein',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 5,
    cookTimeMinutes: 6,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_cv_1', inventoryItemId: 'TOT-004', itemName: 'Noodles (dry, for chowmein)', quantity: 0.14, unit: 'kg', isOptional: false, costPerUnit: 65 },
      { id: 'ing_cv_2', inventoryItemId: 'TOT-018', itemName: 'Cabbage', quantity: 0.06, unit: 'kg', isOptional: false, costPerUnit: 35 },
      { id: 'ing_cv_3', inventoryItemId: 'TOT-019', itemName: 'Carrot', quantity: 0.03, unit: 'kg', isOptional: false, costPerUnit: 45 },
      { id: 'ing_cv_4', inventoryItemId: 'TOT-017', itemName: 'Capsicum (bell pepper)', quantity: 0.025, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_cv_5', inventoryItemId: 'TOT-014', itemName: 'Onion', quantity: 0.03, unit: 'kg', isOptional: false, costPerUnit: 40 },
      { id: 'ing_cv_6', inventoryItemId: 'TOT-015', itemName: 'Spring onion', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_cv_7', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.02, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_cv_8', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.01, unit: 'litre', isOptional: false, costPerUnit: 90 },
      { id: 'ing_cv_9', inventoryItemId: 'TOT-008', itemName: 'Chilli sauce / Schezwan sauce', quantity: 0.01, unit: 'litre', isOptional: false, costPerUnit: 110 },
      { id: 'ing_cv_10', inventoryItemId: 'TOT-021', itemName: 'Salt', quantity: 0.004, unit: 'kg', isOptional: false, costPerUnit: 25 }
    ],
    instructions: [
      { step: 1, description: 'Parboil dry noodles, drain, and toss lightly with oil.', timeMinutes: 3 },
      { step: 2, description: 'Stir-fry aromatics and julienned vegetables on high flame, add noodles and sauces.', timeMinutes: 3 }
    ],
    costing: {
      ingredientsCost: 16.87,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 22.87,
      sellingPrice: 80,
      costPerPortion: 22.87,
      grossProfit: 57.13,
      marginPercentage: 71.41
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_chow_egg',
    name: 'Egg Chowmein',
    description: 'Classic wok-tossed chowmein with scrambled farm eggs and crisp garden vegetables.',
    categoryId: 'Chowmein',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 5,
    cookTimeMinutes: 7,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_ce_1', inventoryItemId: 'TOT-004', itemName: 'Noodles (dry, for chowmein)', quantity: 0.14, unit: 'kg', isOptional: false, costPerUnit: 65 },
      { id: 'ing_ce_2', inventoryItemId: 'TOT-003', itemName: 'Eggs', quantity: 1, unit: 'pcs', isOptional: false, costPerUnit: 7 },
      { id: 'ing_ce_3', inventoryItemId: 'TOT-018', itemName: 'Cabbage', quantity: 0.05, unit: 'kg', isOptional: false, costPerUnit: 35 },
      { id: 'ing_ce_4', inventoryItemId: 'TOT-019', itemName: 'Carrot', quantity: 0.025, unit: 'kg', isOptional: false, costPerUnit: 45 },
      { id: 'ing_ce_5', inventoryItemId: 'TOT-014', itemName: 'Onion', quantity: 0.03, unit: 'kg', isOptional: false, costPerUnit: 40 },
      { id: 'ing_ce_6', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.025, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_ce_7', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.01, unit: 'litre', isOptional: false, costPerUnit: 90 },
      { id: 'ing_ce_8', inventoryItemId: 'TOT-023', itemName: 'Black pepper powder', quantity: 0.002, unit: 'kg', isOptional: false, costPerUnit: 450 }
    ],
    instructions: [
      { step: 1, description: 'Scramble egg in hot wok with oil and aromatics.', timeMinutes: 2 },
      { step: 2, description: 'Toss with noodles, vegetables, soy sauce, and black pepper.', timeMinutes: 5 }
    ],
    costing: {
      ingredientsCost: 21.46,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 27.46,
      sellingPrice: 90,
      costPerPortion: 27.46,
      grossProfit: 62.54,
      marginPercentage: 69.49
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_chow_chicken',
    name: 'Chicken Chowmein',
    description: 'Signature Talk of the Town Chicken Chowmein with tender marinated chicken strips.',
    categoryId: 'Chowmein',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 6,
    cookTimeMinutes: 8,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_cc_1', inventoryItemId: 'TOT-001', itemName: 'Chicken (boneless/bone-in)', quantity: 0.075, unit: 'kg', isOptional: false, costPerUnit: 240 },
      { id: 'ing_cc_2', inventoryItemId: 'TOT-004', itemName: 'Noodles (dry, for chowmein)', quantity: 0.14, unit: 'kg', isOptional: false, costPerUnit: 65 },
      { id: 'ing_cc_3', inventoryItemId: 'TOT-018', itemName: 'Cabbage', quantity: 0.05, unit: 'kg', isOptional: false, costPerUnit: 35 },
      { id: 'ing_cc_4', inventoryItemId: 'TOT-019', itemName: 'Carrot', quantity: 0.025, unit: 'kg', isOptional: false, costPerUnit: 45 },
      { id: 'ing_cc_5', inventoryItemId: 'TOT-017', itemName: 'Capsicum (bell pepper)', quantity: 0.02, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_cc_6', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.025, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_cc_7', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.012, unit: 'litre', isOptional: false, costPerUnit: 90 },
      { id: 'ing_cc_8', inventoryItemId: 'TOT-008', itemName: 'Chilli sauce / Schezwan sauce', quantity: 0.012, unit: 'litre', isOptional: false, costPerUnit: 110 },
      { id: 'ing_cc_9', inventoryItemId: 'TOT-012', itemName: 'Garlic', quantity: 0.008, unit: 'kg', isOptional: false, costPerUnit: 140 }
    ],
    instructions: [
      { step: 1, description: 'Sear marinated chicken strips in hot wok with garlic.', timeMinutes: 3 },
      { step: 2, description: 'Add vegetables, noodles, and house sauces; toss on high heat.', timeMinutes: 5 }
    ],
    costing: {
      ingredientsCost: 29.62,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 35.62,
      sellingPrice: 110,
      costPerPortion: 35.62,
      grossProfit: 74.38,
      marginPercentage: 67.62
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_chow_pork',
    name: 'Pork Chowmein',
    description: 'Rich smoky wok-tossed chowmein with sliced roasted pork and crisp greens.',
    categoryId: 'Chowmein',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 6,
    cookTimeMinutes: 8,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_cp_1', inventoryItemId: 'TOT-002', itemName: 'Pork', quantity: 0.08, unit: 'kg', isOptional: false, costPerUnit: 340 },
      { id: 'ing_cp_2', inventoryItemId: 'TOT-004', itemName: 'Noodles (dry, for chowmein)', quantity: 0.14, unit: 'kg', isOptional: false, costPerUnit: 65 },
      { id: 'ing_cp_3', inventoryItemId: 'TOT-018', itemName: 'Cabbage', quantity: 0.05, unit: 'kg', isOptional: false, costPerUnit: 35 },
      { id: 'ing_cp_4', inventoryItemId: 'TOT-015', itemName: 'Spring onion', quantity: 0.02, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_cp_5', inventoryItemId: 'TOT-012', itemName: 'Garlic', quantity: 0.01, unit: 'kg', isOptional: false, costPerUnit: 140 },
      { id: 'ing_cp_6', inventoryItemId: 'TOT-013', itemName: 'Ginger', quantity: 0.008, unit: 'kg', isOptional: false, costPerUnit: 120 },
      { id: 'ing_cp_7', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.02, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_cp_8', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.012, unit: 'litre', isOptional: false, costPerUnit: 90 }
    ],
    instructions: [
      { step: 1, description: 'Render pork slices with ginger and garlic in hot wok.', timeMinutes: 4 },
      { step: 2, description: 'Toss with noodles, cabbage, soy sauce, and spring onion.', timeMinutes: 4 }
    ],
    costing: {
      ingredientsCost: 39.82,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 45.82,
      sellingPrice: 110,
      costPerPortion: 45.82,
      grossProfit: 64.18,
      marginPercentage: 58.35
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_chow_mixed',
    name: 'Mixed Chowmein',
    description: 'Loaded chowmein combining tender chicken, roasted pork, egg, and fresh vegetables.',
    categoryId: 'Chowmein',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 7,
    cookTimeMinutes: 9,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_cm_1', inventoryItemId: 'TOT-001', itemName: 'Chicken (boneless/bone-in)', quantity: 0.045, unit: 'kg', isOptional: false, costPerUnit: 240 },
      { id: 'ing_cm_2', inventoryItemId: 'TOT-002', itemName: 'Pork', quantity: 0.045, unit: 'kg', isOptional: false, costPerUnit: 340 },
      { id: 'ing_cm_3', inventoryItemId: 'TOT-003', itemName: 'Eggs', quantity: 1, unit: 'pcs', isOptional: false, costPerUnit: 7 },
      { id: 'ing_cm_4', inventoryItemId: 'TOT-004', itemName: 'Noodles (dry, for chowmein)', quantity: 0.14, unit: 'kg', isOptional: false, costPerUnit: 65 },
      { id: 'ing_cm_5', inventoryItemId: 'TOT-018', itemName: 'Cabbage', quantity: 0.045, unit: 'kg', isOptional: false, costPerUnit: 35 },
      { id: 'ing_cm_6', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.025, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_cm_7', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.015, unit: 'litre', isOptional: false, costPerUnit: 90 }
    ],
    instructions: [
      { step: 1, description: 'Stir-fry pork, chicken, and egg over high flame.', timeMinutes: 4 },
      { step: 2, description: 'Toss with noodles, vegetables, and house seasonings.', timeMinutes: 5 }
    ],
    costing: {
      ingredientsCost: 34.72,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 40.72,
      sellingPrice: 140,
      costPerPortion: 40.72,
      grossProfit: 99.28,
      marginPercentage: 70.91
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_fr_veg',
    name: 'Veg Fried Rice',
    description: 'Fragrant wok-tossed rice with finely diced carrots, beans, capsicum, and spring onions.',
    categoryId: 'Fried Rice',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 5,
    cookTimeMinutes: 6,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_fv_1', inventoryItemId: 'TOT-005', itemName: 'Rice (raw, for fried rice)', quantity: 0.13, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fv_2', inventoryItemId: 'TOT-019', itemName: 'Carrot', quantity: 0.03, unit: 'kg', isOptional: false, costPerUnit: 45 },
      { id: 'ing_fv_3', inventoryItemId: 'TOT-020', itemName: 'Beans', quantity: 0.025, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fv_4', inventoryItemId: 'TOT-017', itemName: 'Capsicum (bell pepper)', quantity: 0.02, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_fv_5', inventoryItemId: 'TOT-015', itemName: 'Spring onion', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fv_6', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.02, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_fv_7', inventoryItemId: 'TOT-021', itemName: 'Salt', quantity: 0.004, unit: 'kg', isOptional: false, costPerUnit: 25 },
      { id: 'ing_fv_8', inventoryItemId: 'TOT-023', itemName: 'Black pepper powder', quantity: 0.002, unit: 'kg', isOptional: false, costPerUnit: 450 }
    ],
    instructions: [
      { step: 1, description: 'Steam raw rice and chill for dry grain separation.', timeMinutes: 3 },
      { step: 2, description: 'Sauté finely diced vegetables in hot wok and toss rice on high heat.', timeMinutes: 3 }
    ],
    costing: {
      ingredientsCost: 15.07,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 21.07,
      sellingPrice: 90,
      costPerPortion: 21.07,
      grossProfit: 68.93,
      marginPercentage: 76.59
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_fr_egg',
    name: 'Egg Fried Rice',
    description: 'Wok-tossed aromatic fried rice with fluffy golden egg ribbons and spring onion.',
    categoryId: 'Fried Rice',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 5,
    cookTimeMinutes: 6,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_fe_1', inventoryItemId: 'TOT-005', itemName: 'Rice (raw, for fried rice)', quantity: 0.13, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fe_2', inventoryItemId: 'TOT-003', itemName: 'Eggs', quantity: 1, unit: 'pcs', isOptional: false, costPerUnit: 7 },
      { id: 'ing_fe_3', inventoryItemId: 'TOT-019', itemName: 'Carrot', quantity: 0.025, unit: 'kg', isOptional: false, costPerUnit: 45 },
      { id: 'ing_fe_4', inventoryItemId: 'TOT-020', itemName: 'Beans', quantity: 0.02, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fe_5', inventoryItemId: 'TOT-015', itemName: 'Spring onion', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fe_6', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.022, unit: 'litre', isOptional: false, costPerUnit: 135 }
    ],
    instructions: [
      { step: 1, description: 'Flash-fry beaten egg in smoking wok.', timeMinutes: 2 },
      { step: 2, description: 'Toss with chilled rice, diced vegetables, and white/black pepper.', timeMinutes: 4 }
    ],
    costing: {
      ingredientsCost: 19.49,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 25.49,
      sellingPrice: 100,
      costPerPortion: 25.49,
      grossProfit: 74.51,
      marginPercentage: 74.51
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_fr_chicken',
    name: 'Chicken Fried Rice',
    description: 'Signature wok-fried rice with diced marinated chicken, egg, and crisp vegetables.',
    categoryId: 'Fried Rice',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 6,
    cookTimeMinutes: 7,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_fc_1', inventoryItemId: 'TOT-001', itemName: 'Chicken (boneless/bone-in)', quantity: 0.075, unit: 'kg', isOptional: false, costPerUnit: 240 },
      { id: 'ing_fc_2', inventoryItemId: 'TOT-005', itemName: 'Rice (raw, for fried rice)', quantity: 0.13, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fc_3', inventoryItemId: 'TOT-019', itemName: 'Carrot', quantity: 0.025, unit: 'kg', isOptional: false, costPerUnit: 45 },
      { id: 'ing_fc_4', inventoryItemId: 'TOT-020', itemName: 'Beans', quantity: 0.02, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fc_5', inventoryItemId: 'TOT-015', itemName: 'Spring onion', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fc_6', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.022, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_fc_7', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.008, unit: 'litre', isOptional: false, costPerUnit: 90 }
    ],
    instructions: [
      { step: 1, description: 'Stir-fry diced chicken with garlic and ginger.', timeMinutes: 3 },
      { step: 2, description: 'Add rice, vegetables, and soy seasoning; toss over high flame.', timeMinutes: 4 }
    ],
    costing: {
      ingredientsCost: 27.82,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 33.82,
      sellingPrice: 110,
      costPerPortion: 33.82,
      grossProfit: 76.18,
      marginPercentage: 69.25
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_fr_pork',
    name: 'Pork Fried Rice',
    description: 'Smoky wok-fried rice with tender roasted pork cubes, garlic chives, and soy glaze.',
    categoryId: 'Fried Rice',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 6,
    cookTimeMinutes: 7,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_fp_1', inventoryItemId: 'TOT-002', itemName: 'Pork', quantity: 0.08, unit: 'kg', isOptional: false, costPerUnit: 340 },
      { id: 'ing_fp_2', inventoryItemId: 'TOT-005', itemName: 'Rice (raw, for fried rice)', quantity: 0.13, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fp_3', inventoryItemId: 'TOT-019', itemName: 'Carrot', quantity: 0.025, unit: 'kg', isOptional: false, costPerUnit: 45 },
      { id: 'ing_fp_4', inventoryItemId: 'TOT-015', itemName: 'Spring onion', quantity: 0.02, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fp_5', inventoryItemId: 'TOT-012', itemName: 'Garlic', quantity: 0.008, unit: 'kg', isOptional: false, costPerUnit: 140 },
      { id: 'ing_fp_6', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.02, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_fp_7', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.01, unit: 'litre', isOptional: false, costPerUnit: 90 }
    ],
    instructions: [
      { step: 1, description: 'Sear diced pork with minced garlic until caramelized.', timeMinutes: 3 },
      { step: 2, description: 'Toss with rice, vegetables, and dark soy.', timeMinutes: 4 }
    ],
    costing: {
      ingredientsCost: 38.02,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 44.02,
      sellingPrice: 120,
      costPerPortion: 44.02,
      grossProfit: 75.98,
      marginPercentage: 63.32
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_fr_mixed',
    name: 'Mixed Fried Rice',
    description: 'House special fried rice loaded with chicken, roasted pork, egg, and garden vegetables.',
    categoryId: 'Fried Rice',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Medium (1 portion)',
    prepTimeMinutes: 7,
    cookTimeMinutes: 8,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_fm_1', inventoryItemId: 'TOT-001', itemName: 'Chicken (boneless/bone-in)', quantity: 0.045, unit: 'kg', isOptional: false, costPerUnit: 240 },
      { id: 'ing_fm_2', inventoryItemId: 'TOT-002', itemName: 'Pork', quantity: 0.045, unit: 'kg', isOptional: false, costPerUnit: 340 },
      { id: 'ing_fm_3', inventoryItemId: 'TOT-003', itemName: 'Eggs', quantity: 1, unit: 'pcs', isOptional: false, costPerUnit: 7 },
      { id: 'ing_fm_4', inventoryItemId: 'TOT-005', itemName: 'Rice (raw, for fried rice)', quantity: 0.13, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fm_5', inventoryItemId: 'TOT-019', itemName: 'Carrot', quantity: 0.02, unit: 'kg', isOptional: false, costPerUnit: 45 },
      { id: 'ing_fm_6', inventoryItemId: 'TOT-015', itemName: 'Spring onion', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 60 },
      { id: 'ing_fm_7', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.022, unit: 'litre', isOptional: false, costPerUnit: 135 }
    ],
    instructions: [
      { step: 1, description: 'Stir-fry chicken, pork, and egg in hot wok.', timeMinutes: 4 },
      { step: 2, description: 'Toss with rice, vegetables, and house seasonings.', timeMinutes: 4 }
    ],
    costing: {
      ingredientsCost: 32.92,
      gasCost: 2.5,
      electricityCost: 0.5,
      waterCost: 0.25,
      labourCost: 1.5,
      packagingCost: 1.25,
      overheadCost: 0,
      totalCost: 38.92,
      sellingPrice: 150,
      costPerPortion: 38.92,
      grossProfit: 111.08,
      marginPercentage: 74.05
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_chilly_chicken_gravy',
    name: 'Chicken Chilly (Gravy)',
    description: 'Crispy battered chicken tossed in spicy garlic-chilli-soy gravy with capsicum and onions.',
    categoryId: 'Specials',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Standard Full Portion',
    prepTimeMinutes: 8,
    cookTimeMinutes: 10,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_ccg_1', inventoryItemId: 'TOT-001', itemName: 'Chicken (boneless/bone-in)', quantity: 0.25, unit: 'kg', isOptional: false, costPerUnit: 240 },
      { id: 'ing_ccg_2', inventoryItemId: 'TOT-026', itemName: 'Corn flour', quantity: 0.035, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_ccg_3', inventoryItemId: 'TOT-017', itemName: 'Capsicum (bell pepper)', quantity: 0.05, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_ccg_4', inventoryItemId: 'TOT-014', itemName: 'Onion', quantity: 0.06, unit: 'kg', isOptional: false, costPerUnit: 40 },
      { id: 'ing_ccg_5', inventoryItemId: 'TOT-016', itemName: 'Green chilli', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 80 },
      { id: 'ing_ccg_6', inventoryItemId: 'TOT-012', itemName: 'Garlic', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 140 },
      { id: 'ing_ccg_7', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.06, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_ccg_8', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.02, unit: 'litre', isOptional: false, costPerUnit: 90 },
      { id: 'ing_ccg_9', inventoryItemId: 'TOT-008', itemName: 'Chilli sauce / Schezwan sauce', quantity: 0.025, unit: 'litre', isOptional: false, costPerUnit: 110 },
      { id: 'ing_ccg_10', inventoryItemId: 'TOT-011', itemName: 'Oyster sauce', quantity: 0.015, unit: 'litre', isOptional: false, costPerUnit: 160 }
    ],
    instructions: [
      { step: 1, description: 'Coat chicken in corn flour batter and crisp-fry until golden.', timeMinutes: 5 },
      { step: 2, description: 'Sauté diced onion, capsicum, garlic, and green chillies; simmer in thickened soy-chilli gravy.', timeMinutes: 5 }
    ],
    costing: {
      ingredientsCost: 98.0,
      gasCost: 4.5,
      electricityCost: 1.0,
      waterCost: 0.5,
      labourCost: 3.5,
      packagingCost: 2.5,
      overheadCost: 0,
      totalCost: 110.0,
      sellingPrice: 260,
      costPerPortion: 110.0,
      grossProfit: 150.0,
      marginPercentage: 57.69
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_chilly_chicken_dry',
    name: 'Chicken Chilly (Dry)',
    description: 'Wok-seared crispy chicken tossed dry with fiery green chillies, garlic, capsicum, and spring onion.',
    categoryId: 'Specials',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Standard Full Portion',
    prepTimeMinutes: 8,
    cookTimeMinutes: 9,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_ccd_1', inventoryItemId: 'TOT-001', itemName: 'Chicken (boneless/bone-in)', quantity: 0.25, unit: 'kg', isOptional: false, costPerUnit: 240 },
      { id: 'ing_ccd_2', inventoryItemId: 'TOT-026', itemName: 'Corn flour', quantity: 0.025, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_ccd_3', inventoryItemId: 'TOT-017', itemName: 'Capsicum (bell pepper)', quantity: 0.05, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_ccd_4', inventoryItemId: 'TOT-014', itemName: 'Onion', quantity: 0.05, unit: 'kg', isOptional: false, costPerUnit: 40 },
      { id: 'ing_ccd_5', inventoryItemId: 'TOT-016', itemName: 'Green chilli', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 80 },
      { id: 'ing_ccd_6', inventoryItemId: 'TOT-012', itemName: 'Garlic', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 140 },
      { id: 'ing_ccd_7', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.055, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_ccd_8', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.018, unit: 'litre', isOptional: false, costPerUnit: 90 },
      { id: 'ing_ccd_9', inventoryItemId: 'TOT-008', itemName: 'Chilli sauce / Schezwan sauce', quantity: 0.02, unit: 'litre', isOptional: false, costPerUnit: 110 }
    ],
    instructions: [
      { step: 1, description: 'Crisp-fry marinated chicken pieces.', timeMinutes: 5 },
      { step: 2, description: 'Toss rapidly on high wok heat with garlic, chillies, capsicum, and dry glaze.', timeMinutes: 4 }
    ],
    costing: {
      ingredientsCost: 93.0,
      gasCost: 4.5,
      electricityCost: 1.0,
      waterCost: 0.5,
      labourCost: 3.5,
      packagingCost: 2.5,
      overheadCost: 0,
      totalCost: 105.0,
      sellingPrice: 250,
      costPerPortion: 105.0,
      grossProfit: 145.0,
      marginPercentage: 58.0
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_chilly_pork_gravy',
    name: 'Pork Chilly (Gravy)',
    description: 'Succulent sliced pork simmered in rich Indo-Chinese garlic-chilli-oyster gravy with bell peppers.',
    categoryId: 'Specials',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Standard Full Portion',
    prepTimeMinutes: 8,
    cookTimeMinutes: 10,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_cpg_1', inventoryItemId: 'TOT-002', itemName: 'Pork', quantity: 0.25, unit: 'kg', isOptional: false, costPerUnit: 340 },
      { id: 'ing_cpg_2', inventoryItemId: 'TOT-026', itemName: 'Corn flour', quantity: 0.03, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_cpg_3', inventoryItemId: 'TOT-017', itemName: 'Capsicum (bell pepper)', quantity: 0.05, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_cpg_4', inventoryItemId: 'TOT-014', itemName: 'Onion', quantity: 0.06, unit: 'kg', isOptional: false, costPerUnit: 40 },
      { id: 'ing_cpg_5', inventoryItemId: 'TOT-016', itemName: 'Green chilli', quantity: 0.018, unit: 'kg', isOptional: false, costPerUnit: 80 },
      { id: 'ing_cpg_6', inventoryItemId: 'TOT-012', itemName: 'Garlic', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 140 },
      { id: 'ing_cpg_7', inventoryItemId: 'TOT-013', itemName: 'Ginger', quantity: 0.012, unit: 'kg', isOptional: false, costPerUnit: 120 },
      { id: 'ing_cpg_8', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.045, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_cpg_9', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.02, unit: 'litre', isOptional: false, costPerUnit: 90 },
      { id: 'ing_cpg_10', inventoryItemId: 'TOT-011', itemName: 'Oyster sauce', quantity: 0.015, unit: 'litre', isOptional: false, costPerUnit: 160 }
    ],
    instructions: [
      { step: 1, description: 'Sear pork slices until tender with crisp edges.', timeMinutes: 5 },
      { step: 2, description: 'Toss with aromatics, bell peppers, and rich oyster-chilli gravy.', timeMinutes: 5 }
    ],
    costing: {
      ingredientsCost: 113.0,
      gasCost: 4.5,
      electricityCost: 1.0,
      waterCost: 0.5,
      labourCost: 3.5,
      packagingCost: 2.5,
      overheadCost: 0,
      totalCost: 125.0,
      sellingPrice: 290,
      costPerPortion: 125.0,
      grossProfit: 165.0,
      marginPercentage: 56.9
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'rec_chilly_pork_dry',
    name: 'Pork Chilly (Dry)',
    description: 'Signature dry-fried pork tossed with roasted garlic, slit green chillies, onion petals, and capsicum.',
    categoryId: 'Specials',
    version: '1.0',
    status: 'ACTIVE',
    yieldQuantity: 1,
    yieldUnit: 'portion',
    servingSize: 'Standard Full Portion',
    prepTimeMinutes: 8,
    cookTimeMinutes: 9,
    shelfLifeDays: 1,
    ingredients: [
      { id: 'ing_cpd_1', inventoryItemId: 'TOT-002', itemName: 'Pork', quantity: 0.25, unit: 'kg', isOptional: false, costPerUnit: 340 },
      { id: 'ing_cpd_2', inventoryItemId: 'TOT-017', itemName: 'Capsicum (bell pepper)', quantity: 0.05, unit: 'kg', isOptional: false, costPerUnit: 70 },
      { id: 'ing_cpd_3', inventoryItemId: 'TOT-014', itemName: 'Onion', quantity: 0.05, unit: 'kg', isOptional: false, costPerUnit: 40 },
      { id: 'ing_cpd_4', inventoryItemId: 'TOT-016', itemName: 'Green chilli', quantity: 0.018, unit: 'kg', isOptional: false, costPerUnit: 80 },
      { id: 'ing_cpd_5', inventoryItemId: 'TOT-012', itemName: 'Garlic', quantity: 0.015, unit: 'kg', isOptional: false, costPerUnit: 140 },
      { id: 'ing_cpd_6', inventoryItemId: 'TOT-013', itemName: 'Ginger', quantity: 0.012, unit: 'kg', isOptional: false, costPerUnit: 120 },
      { id: 'ing_cpd_7', inventoryItemId: 'TOT-006', itemName: 'Cooking oil', quantity: 0.04, unit: 'litre', isOptional: false, costPerUnit: 135 },
      { id: 'ing_cpd_8', inventoryItemId: 'TOT-007', itemName: 'Soy sauce', quantity: 0.018, unit: 'litre', isOptional: false, costPerUnit: 90 },
      { id: 'ing_cpd_9', inventoryItemId: 'TOT-008', itemName: 'Chilli sauce / Schezwan sauce', quantity: 0.02, unit: 'litre', isOptional: false, costPerUnit: 110 }
    ],
    instructions: [
      { step: 1, description: 'Render and crisp sliced pork in wok.', timeMinutes: 5 },
      { step: 2, description: 'Toss on high heat with garlic, ginger, green chillies, and soy-chilli reduction.', timeMinutes: 4 }
    ],
    costing: {
      ingredientsCost: 108.0,
      gasCost: 4.5,
      electricityCost: 1.0,
      waterCost: 0.5,
      labourCost: 3.5,
      packagingCost: 2.5,
      overheadCost: 0,
      totalCost: 120.0,
      sellingPrice: 280,
      costPerPortion: 120.0,
      grossProfit: 160.0,
      marginPercentage: 57.14
    },
    createdAt: NOW,
    updatedAt: NOW
  }
];

/**
 * 14 Approved Staged Recipes conforming to validateInventoryStaging rules.
 */
export const APPROVED_STAGED_RECIPES: StagedRecipe[] = MASTER_RECIPES.map(recipe => ({
  menuItem: recipe.name,
  status: 'DRAFT',
  stockDeductionReady: false,
  ingredients: recipe.ingredients.map(ing => ({
    ingredient: ing.itemName,
    inventoryId: ing.inventoryItemId,
    quantity: ing.quantity,
    unit: ing.unit,
    verified: false,
    stockDeductionReady: false
  }))
}));
