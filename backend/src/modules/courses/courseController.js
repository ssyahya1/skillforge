import { createCourseService,getCoursesService,getCourseByIdService,updateCourseService,
  publishCourseService,archiveCourseService,softDeleteCourseService,restoreCourseService} from "./courseService.js";
export const createCourseController = async (req, res, next) => {
  try {
    const courseData = req.body;
    const adminId = req.user.id;
    const newCourse = await createCourseService(courseData, adminId);
    res.status(201).json(newCourse);
  } catch (error) {
    next(error);
  }
};

export const getCoursesController = async (req, res, next) => {
  try {

    const filter = req.validateQuery;
    const { courses, total } = await getCoursesService(filter);
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 10;
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
  data: courses,
  pagination: {
    page,
    limit,
    total,
    totalPages,
  },
});
  } catch (error) {
    next(error);
  }
};
export const getCourseByIdController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const course = await getCourseByIdService(courseId);
    if (!course) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Course not found.",
      });
    }
    res.status(200).json(course);
  } catch (error) {
    next(error);
  }
};
export const updateCourseController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const courseData = req.body;
    const updatedCourse = await updateCourseService(courseId, courseData);
    if (!updatedCourse) {
  return res.status(404).json({
    error: "NOT_FOUND",
    message: "Course not found.",
  });
}
    res.status(200).json(updatedCourse);
  } catch (error) {
    next(error);
  }
};
export const publishCourseController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const publishedCourse = await publishCourseService(courseId);
    res.status(200).json(publishedCourse);
  } catch (error) {

    next(error);
  }
};
export const archiveCourseController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const archivedCourse = await archiveCourseService(courseId);
    res.status(200).json(archivedCourse);
  }
  catch (error) {
    next(error);
  }
};
export const softDeleteCourseController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const deletedCourse = await softDeleteCourseService(courseId);
    res.status(200).json(deletedCourse);
  }
  catch (error) {
    next(error);
  }
};
export const restoreCourseController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const restoredCourse = await restoreCourseService(courseId);
    res.status(200).json(restoredCourse);
  }
  catch (error) {
    next(error);
  }
};
