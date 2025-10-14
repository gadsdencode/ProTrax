import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler, createError } from "../errorHandler";
import { insertCustomFieldSchema } from "@shared/schema";

const router = Router();

// Get custom fields for project
router.get('/projects/:projectId/custom-fields', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const fields = await storage.getCustomFields(projectId);
  res.json(fields);
}));

// Create custom field
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertCustomFieldSchema.parse(req.body);
  const field = await storage.createCustomField(data);
  res.status(201).json(field);
}));

// Delete custom field
router.delete('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await storage.deleteCustomField(id);
  res.status(204).send();
}));

// Get task custom field values
router.get('/tasks/:taskId/custom-field-values', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const values = await storage.getTaskCustomFieldValues(taskId);
  res.json(values);
}));

// Set single custom field value
router.put('/tasks/:taskId/custom-field-values/:fieldId', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const customFieldId = parseInt(req.params.fieldId);
  const { value } = req.body;
  const result = await storage.setTaskCustomFieldValue(taskId, customFieldId, value);
  res.json(result);
}));

// Set batch custom field values
router.put('/tasks/:taskId/custom-field-values/batch', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { values } = req.body;
  
  console.log('Batch endpoint received:', JSON.stringify(req.body));
  console.log('Values array:', JSON.stringify(values));
  
  if (!Array.isArray(values)) {
    throw createError.badRequest("Values must be an array");
  }
  
  const formattedValues = values.map((v, index) => {
    console.log(`Processing value[${index}]:`, JSON.stringify(v));
    const fieldId = parseInt(v.customFieldId);
    console.log(`Parsed customFieldId "${v.customFieldId}" as ${fieldId}`);
    
    if (isNaN(fieldId)) {
      console.error(`Failed to parse customFieldId at index ${index}:`, v.customFieldId);
      throw createError.badRequest(`Invalid customFieldId at index ${index}: "${v.customFieldId}" (type: ${typeof v.customFieldId})`);
    }
    return {
      customFieldId: fieldId,
      value: v.value
    };
  });
  
  console.log('Formatted values for storage:', JSON.stringify(formattedValues));
  const results = await storage.setTaskCustomFieldValuesBatch(taskId, formattedValues);
  res.json(results);
}));

export default router;