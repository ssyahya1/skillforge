import * as submissionService from "./submissionService.js";
export const createSubmissionController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const exerciseId = req.validatedParams.exerciseId;
    const submissionData = req.body;
    const submission = await submissionService.createSubmissionService(
      userId,
      exerciseId,
      submissionData,
    );
    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
};
export const getSubmissionDetailsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const submissionId = req.validatedParams.submissionId;
    const submission = await submissionService.getSubmissionDetailsService(
      userId,
      submissionId,
    );
    res.status(200).json(submission);
  } catch (error) {
    next(error);
  }
};
export const getSubmissionsHistoryController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const exerciseId = req.validatedParams.exerciseId;
    const pagination = req.validatedQuery;
    const submissions = await submissionService.getSubmissionHistoryService(
      userId,
      exerciseId,
      pagination,
    );
    res.status(200).json(submissions);
  } catch (error) {
    next(error);
  }
};

export const revealSolutionController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const exerciseId = req.validatedParams.exerciseId;
    const languageId = req.body.languageId;
    const solution = await submissionService.revealSolutionService(
      userId,
      exerciseId,
      languageId,
    );
    res.status(200).json(solution);
  } catch (error) {
    next(error);
  }
};
