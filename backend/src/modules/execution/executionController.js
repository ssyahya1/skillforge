import * as executionService from "./executionService.js";

export const queueSubmissionController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const submissionId = req.validatedParams.submissionId;

    const result = await executionService.queueSubmission(submissionId, userId);

    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSubmissionResultsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const submissionId = req.validatedParams.submissionId;

    const result = await executionService.getSubmissionResults(
      submissionId,
      userId,
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
