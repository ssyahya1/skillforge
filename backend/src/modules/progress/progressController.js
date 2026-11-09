import { pool } from "../../database/pool.js";
import * as progressService from "./progressService.js";

async function withTransaction(client, operation) {
  await client.query("BEGIN");

  try {
    const result = await operation();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "Progress transaction failed and rollback could not be completed",
      );
    }

    throw error;
  }
}

export async function getEnrollmentProgressController(req, res, next) {
  try {
    const { enrollmentId } = req.validatedParams;
    const result = await progressService.getEnrollmentProgressService(
      enrollmentId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getLessonProgressController(req, res, next) {
  try {
    const { enrollmentId, lessonId } = req.validatedParams;
    const result = await progressService.getLessonProgressService(
      enrollmentId,
      lessonId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getLessonExerciseProgressController(req, res, next) {
  try {
    const { enrollmentId, lessonId } = req.validatedParams;
    const result = await progressService.getLessonExerciseProgressService(
      enrollmentId,
      lessonId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getExerciseProgressController(req, res, next) {
  try {
    const { enrollmentId, exerciseId } = req.validatedParams;
    const result = await progressService.getExerciseProgressService(
      enrollmentId,
      exerciseId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function startLessonController(req, res, next) {
  let client;

  try {
    const { enrollmentId, lessonId } = req.validatedParams;
    client = await pool.connect();

    const result = await withTransaction(client, () =>
      progressService.startLessonService(
        client,
        enrollmentId,
        lessonId,
        req.user.id,
      ),
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function completeLessonContentController(req, res, next) {
  let client;

  try {
    const { enrollmentId, lessonId } = req.validatedParams;
    client = await pool.connect();

    const result = await withTransaction(client, () =>
      progressService.completeLessonContentService(
        client,
        enrollmentId,
        lessonId,
        req.user.id,
      ),
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function getPreviousPublishedLessonController(req, res, next) {
  try {
    const { enrollmentId, lessonId } = req.validatedParams;
    const result = await progressService.getPreviousPublishedLessonService(
      enrollmentId,
      lessonId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getActiveEnrollmentForExerciseController(req, res, next) {
  try {
    const { exerciseId } = req.validatedParams;
    const result = await progressService.getActiveEnrollmentForExerciseService(
      req.user.id,
      exerciseId,
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
