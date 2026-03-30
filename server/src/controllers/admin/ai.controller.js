import { sendSuccess } from '../../utils/response.js';
import { generateScenicCopywriting } from '../../services/ai-copywriting.service.js';
import {
  getAiChatLogs,
  getAiCopywritingLogs,
  getAiTripLogs
} from '../../services/ai-logs.service.js';

export async function scenicCopywriting(req, res, next) {
  try {
    const result = await generateScenicCopywriting(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getChatLogs(req, res, next) {
  try {
    const result = await getAiChatLogs(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getTripLogs(req, res, next) {
  try {
    const result = await getAiTripLogs(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getCopywritingLogs(req, res, next) {
  try {
    const result = await getAiCopywritingLogs(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
