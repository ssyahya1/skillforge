import * as enrollmentService from "./enrollmentService.js";

export async function createEnrollment(req, res, next) {
  try {
    const result = await enrollmentService.createEnrollmentService(
      req.user.id,
      (req.validateBody || req.body).courseId,
    );

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getStudentEnrollments(req, res, next) {
  try {
    const result = await enrollmentService.getStudentEnrollmentsService(
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getEnrollment(req, res, next) {
  try {
    const result = await enrollmentService.getEnrollmentService(
      req.params.enrollmentId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getEnrollmentByCourse(req, res, next) {
  try {
    const result = await enrollmentService.getEnrollmentByCourseService(
      req.params.courseId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function cancelEnrollment(req, res, next) {
  try {
    const result = await enrollmentService.cancelEnrollmentService(
      req.params.enrollmentId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function completeEnrollment(req, res, next) {
  try {
    const result = await enrollmentService.completeEnrollmentService(
      req.params.enrollmentId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateEnrollmentActivity(req, res, next) {
  try {
    const result = await enrollmentService.updateEnrollmentActivityService(
      req.params.enrollmentId,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
