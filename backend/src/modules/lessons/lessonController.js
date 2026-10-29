import {
  createLessonService,
  getLessonByIdService,
  listLessonsService,
  updateLessonService,
  publishLessonService,
  unpublishLessonService,
  softDeleteLessonService,
  restoreLessonService,
} from "./lessonService.js";
export const createLessonController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const lessonData = req.body;
    const newLesson = await createLessonService(courseId, lessonData);
    res.status(201).json(newLesson);
  } catch (error) {
    next(error);
  }
};
export const listLessonsController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const queryOptions = req.validateQuery;
    const { lessons, pagination } = await listLessonsService(
      courseId,
      queryOptions,
    );
    res.status(200).json({
      data: lessons,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};
export const getLessonByIdController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const lessonId = req.validatedParams.lessonId;
    const lesson = await getLessonByIdService(courseId, lessonId);
    res.status(200).json(lesson);
  } catch (error) {
    next(error);
  }
};
export const updateLessonController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const lessonId = req.validatedParams.lessonId;
    const lessonData = req.body;
    const updatedLesson = await updateLessonService(
      courseId,
      lessonId,
      lessonData,
    );
    res.status(200).json(updatedLesson);
  } catch (error) {
    next(error);
  }
};
export const publishLessonController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const lessonId = req.validatedParams.lessonId;
    const publishLesson = await publishLessonService(
      courseId,
      lessonId,
    );
    res.status(200).json(publishLesson);
  } catch (error) {
    next(error);
  }
};
export const unpublishLessonController = async(req,res,next) => {
    try{
        const courseId = req.validatedParams.courseId;
        const lessonId = req.validatedParams.lessonId;
        const unpublishLesson = await unpublishLessonService(courseId,lessonId);
        res.status(200).json(unpublishLesson);
    }
    catch(error){
        next(error);
    }

};
export const softDeleteLessonController = async(req,res,next) => {
    try{
        const courseId = req.validatedParams.courseId;
        const lessonId = req.validatedParams.lessonId;
        const softdelete = await softDeleteLessonService(courseId,lessonId);
        res.status(200).json(softdelete);
    }
    catch(error){
        next(error);
    }
};
export const restoreLessonController = async (req, res, next) => {
  try {
    const courseId = req.validatedParams.courseId;
    const lessonId = req.validatedParams.lessonId;
    const restoredlesson = await restoreLessonService(courseId,lessonId);
    res.status(200).json(restoredlesson);
  }
  catch (error) {
    next(error);
  }
};
