import {createCourse,getCourses,getCourseById,updateCourse,
    publishCourse,archiveCourse,softDeleteCourse,restoreCourse,purgeExpiredCourses} from "./courseRepository.js";
export const createCourseService = async(courseData, adminId) => {
    const newCourse = await createCourse(courseData, adminId);
    return newCourse;
};
export const getCoursesService = async(filter) => {
    const courses = await getCourses(filter);
    return courses;
};
export const getCourseByIdService = async(courseId) => {
    const course = await getCourseById(courseId);
    return course;
};
export const updateCourseService = async (courseId, courseData) => {
  const updatedCourse = await updateCourse(courseId, courseData);
  return updatedCourse;
};
export const publishCourseService = async (courseId) => {
  const publishedCourse = await publishCourse(courseId);

  if (publishedCourse) {
    return publishedCourse;
  }

  const existingCourse = await getCourseById(courseId);

  if (!existingCourse) {
    const error = new Error("Course not found.");
    error.statusCode = 404;
    throw error;
  }

  if (existingCourse.status === "published") {
    const error = new Error("Course is already published.");
    error.statusCode = 409;
    throw error;
  }

  const error = new Error(
    `Cannot publish a course with status '${existingCourse.status}'.`
  );
  error.statusCode = 409;
  throw error;
};

export const archiveCourseService = async (courseId) => {
  const archivedCourse = await archiveCourse(courseId);

  if (archivedCourse) {
    return archivedCourse;
  }

  const existingCourse = await getCourseById(courseId);

  if (!existingCourse) {
    const error = new Error("Course not found.");
    error.statusCode = 404;
    throw error;
  }

  if (existingCourse.status === "archived") {
    const error = new Error("Course is already archived.");
    error.statusCode = 409;
    throw error;
  }

  const error = new Error(
    `Cannot archive a course with status '${existingCourse.status}'.`
  );
  error.statusCode = 409;
  throw error;
};

export const softDeleteCourseService = async (courseId) => {
  const deletedCourse = await softDeleteCourse(courseId);

  if (deletedCourse) {
    return deletedCourse;
  }

  const error = new Error("Course not found.");
  error.statusCode = 404;
  throw error;
};
export const restoreCourseService = async (courseId) => {
  const restoredCourse = await restoreCourse(courseId);
  if (restoredCourse) {
    return restoredCourse;
    }
    const error = new Error("Course not found or cannot be restored.");
    error.statusCode = 404;
    throw error;
}

export const purgeExpiredCoursesService = async (batchSize = 100) => {
  const purgedCourseIds = await purgeExpiredCourses(batchSize);

  console.info(
    `[Course Purge] Permanently deleted ${purgedCourseIds.length} expired course(s).`
  );

  return {
    purgedCount: purgedCourseIds.length,
    purgedCourseIds,
  };
};
