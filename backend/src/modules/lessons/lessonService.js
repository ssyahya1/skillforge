import * as lessonRepository from "./lessonRepository.js";
export const createLessonService = async (courseId, lessonData) => {
  const course = await lessonRepository.findCourseById(courseId);
    if (!course || course.deleted_at) {
        const error = new Error("Course not found.");
        error.statusCode = 404;
        throw error;
    }

    if (course.status === "archived") {
        const error = new Error("Course is archived.");
        error.statusCode = 409;
        throw error;
    }

    return await lessonRepository.createLesson(courseId, lessonData);
}

export const getLessonByIdService = async (courseId,lessonId) => {
  const course = await lessonRepository.findCourseById(courseId);
  if (!course || course.deleted_at) {
    const error = new Error("Course not found.");
    error.statusCode = 404;
    throw error;
  }
  const lesson = await lessonRepository.findLessonById(courseId,lessonId);
  if (!lesson) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }
  return lesson;
}
export const listLessonsService = async (courseId,queryOptions) => {
    const course = await lessonRepository.findCourseById(courseId);
    if (!course || course.deleted_at) {
        const error = new Error("Course not found.");
        error.statusCode = 404;
        throw error;
    }
    return await lessonRepository.listLessonsByCourse(courseId,queryOptions);
}
export const updateLessonService = async (courseId,lessonId,lessonData) => {
    const course = await lessonRepository.findCourseById(courseId);
    if (!course || course.deleted_at) {
        const error = new Error("Course not found.");
        error.statusCode = 404;
        throw error;
    }
    const lesson = await lessonRepository.findLessonById(courseId,lessonId);
    if (!lesson) {
        const error = new Error("Lesson not found.");
        error.statusCode = 404;
        throw error;
    }
    if (course.status === "archived") {
        const error = new Error("Course is archived.");
        error.statusCode = 409;
        throw error;
    }
    const resultingContent = Object.hasOwn(lessonData, "content")
      ? lessonData.content
      : lesson.content;

    if (lesson.status === "published" && !resultingContent?.trim()) {
        const error = new Error("Lesson content cannot be empty.");
        error.statusCode = 400;
        throw error;
    }

    const updatedLesson = await lessonRepository.updateLesson(
  courseId,
  lessonId,
  lessonData
);

if (!updatedLesson) {
  const error = new Error("Lesson could not be updated.");
  error.statusCode = 404;
  throw error;
}

return updatedLesson;
};

export const publishLessonService = async (courseId, lessonId) => {
  const course = await lessonRepository.findCourseById(courseId);

  if (!course || course.deleted_at) {
    const error = new Error("Course not found.");
    error.statusCode = 404;
    throw error;
  }

  if (course.status === "archived") {
    const error = new Error("Cannot publish lessons in an archived course.");
    error.statusCode = 409;
    throw error;
  }

  const lesson = await lessonRepository.findLessonById(
    courseId,
    lessonId
  );

  if (!lesson) {
    const error = new Error("Lesson not found.");
    error.statusCode = 404;
    throw error;
  }

  if (lesson.status === "published") {
    const error = new Error("Lesson is already published.");
    error.statusCode = 409;
    throw error;
  }

  if (!lesson.title?.trim() || !lesson.slug?.trim()) {
    const error = new Error("Lesson title and slug are required.");
    error.statusCode = 400;
    throw error;
  }

  if (!lesson.content?.trim()) {
    const error = new Error("Lesson content cannot be empty.");
    error.statusCode = 400;
    throw error;
  }

  const updatedLesson = await lessonRepository.updateLessonStatus(
    courseId,
    lessonId,
    "published"
  );

  if (!updatedLesson) {
    const error = new Error("Lesson could not be published.");
    error.statusCode = 404;
    throw error;
  }

  return updatedLesson;
};
export const unpublishLessonService = async (courseId,lessonId) => {
    const course = await lessonRepository.findCourseById(courseId);
    if(!course ||course.deleted_at){
        const error = new Error("Course not found.");
        error.statusCode = 404;
        throw error;
    }
    if(course.status === "archived"){
        const error = new Error("Cannot unpublish lessons in an archived course.");
        error.statusCode = 409;
        throw error;
    }
    const lesson = await lessonRepository.findLessonById(courseId,lessonId);
    if(!lesson){
        const error = new Error("Lesson not found in this course.");
        error.statusCode = 404;
        throw error;
    }
    if(lesson.status==="draft"){
        const error = new Error("Lesson is already in draft status.");
        error.statusCode = 409;
        throw error;
    }

  const updatedLesson = await lessonRepository.updateLessonStatus(
    courseId,
    lessonId,
    "draft"
  );
  if (!updatedLesson) {
    const error = new Error("Lesson could not be moved to draft.");
    error.statusCode = 404;
    throw error;
  }
  return updatedLesson;

};
export const softDeleteLessonService = async(courseId,lessonId) => {
    const course = await lessonRepository.findCourseById(courseId)

    if(!course || course.deleted_at){
        const error = new Error("Course not found.");
        error.statusCode = 404;
        throw error;
    }

    const lesson = await lessonRepository.findLessonById(courseId,lessonId)

    if(!lesson){
        const error = new Error("Lesson not found.");
        error.statusCode = 404;
        throw error;
    }
    const deletedLesson = await lessonRepository.softDeleteLesson(courseId,lessonId)
    if(!deletedLesson){
        const error = new Error("Lesson could not be deleted.");
        error.statusCode = 404;
        throw error;
    }
    return deletedLesson;
};
export const restoreLessonService = async (courseId, lessonId) => {
  const course = await lessonRepository.findCourseById(courseId);

  if (!course || course.deleted_at) {
    const error = new Error("Course not found.");
    error.statusCode = 404;
    throw error;
  }

  const restoredLesson = await lessonRepository.restoreLesson(
    courseId,
    lessonId
  );

  if (!restoredLesson) {
    const error = new Error(
      "Lesson could not be restored. It may not exist, may not be deleted, or its recovery deadline may have passed."
    );
    error.statusCode = 404;
    throw error;
  }

  return restoredLesson;
};
export const purgeExpiredLessonService = async (batchSize = 100) => {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    const error = new Error(
      "Batch size must be an integer between 1 and 500."
    );
    error.statusCode = 400;
    throw error;
  }

  const purgedLessonIds =
    await lessonRepository.purgeExpiredLessons(batchSize);

  console.info(
    `[Lesson Purge] Permanently deleted ${purgedLessonIds.length} expired lesson(s).`
  );

  return {
    purgedCount: purgedLessonIds.length,
    purgedLessonIds,
  };
};
