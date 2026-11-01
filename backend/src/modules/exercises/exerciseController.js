import * as exerciseService from "./exerciseService.js";
export const createExerciseController = async (req, res, next) => {
  try {
    const lessonId = req.validatedParams.lessonId;
    const exerciseData = req.body;
    const newExercise = await exerciseService.createExerciseService(
      lessonId,
      exerciseData,
    );
    res.status(201).json(newExercise);
  } catch (error) {
    next(error);
  }
};
export const getExerciseByIdController = async (req, res, next) => {
  try {
    const lessonId = req.validatedParams.lessonId;
    const exerciseId = req.validatedParams.exerciseId;
    const exercise = await exerciseService.getExerciseByIdService(
      lessonId,
      exerciseId,
    );
    res.status(200).json(exercise);
  } catch (error) {
    next(error);
  }
};
export const getExercisesByLessonController = async (req, res, next) => {
  try {
    const lessonId = req.validatedParams.lessonId;

    const exercises =
      await exerciseService.getExercisesByLessonService(lessonId);

    res.status(200).json(exercises);
  } catch (error) {
    next(error);
  }
};
export const updateExerciseController = async (req, res, next) => {
  try {
    const lessonId = req.validatedParams.lessonId;
    const exerciseId = req.validatedParams.exerciseId;
    const exerciseData = req.body;
    const updatedExercise = await exerciseService.updateExerciseService(
      exerciseId,
      lessonId,
      exerciseData,
    );
    res.status(200).json(updatedExercise);
  } catch (error) {
    next(error);
  }
};
export const reorderExercisesController = async (req, res, next) => {
  try {
    const lessonId = req.validatedParams.lessonId;
    const exercises = req.body.exercises;

    const reorderedExercises = await exerciseService.reorderExercisesService(
      lessonId,
      exercises,
    );

    res.status(200).json(reorderedExercises);
  } catch (error) {
    next(error);
  }
};
export const publishExerciseController = async (req, res, next) => {
  try {
    const lessonId = req.validatedParams.lessonId;
    const exerciseId = req.validatedParams.exerciseId;

    const publishedExercise = await exerciseService.publishExerciseService(
      lessonId,
      exerciseId,
    );

    res.status(200).json(publishedExercise);
  } catch (error) {
    next(error);
  }
};
export const archiveExerciseController = async (req, res, next) => {
  try {
    const lessonId = req.validatedParams.lessonId;
    const exerciseId = req.validatedParams.exerciseId;

    const archivedExercise = await exerciseService.archiveExerciseService(
      lessonId,
      exerciseId,
    );

    res.status(200).json(archivedExercise);
  } catch (error) {
    next(error);
  }
};
export const deleteExerciseController = async (req, res, next) => {
  try {
    const lessonId = req.validatedParams.lessonId;
    const exerciseId = req.validatedParams.exerciseId;

    await exerciseService.deleteExerciseService(lessonId, exerciseId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
export const createExerciseLanguageController = async (req,res,next) => {
  try{
    const lessonId = req.validatedParams.lessonId;
    const exerciseId = req.validatedParams.exerciseId;
    const languageData = req.body;
    const createdLanguage = await exerciseService.createExerciseLanguageService(lessonId,exerciseId,languageData);
    res.status(201).json(createdLanguage);
  }
  catch(error){
    next(error);
  }
};
export const getExerciseLanguageController = async (req,res,next) => {
  try{
    const lessonId = req.validatedParams.lessonId;
    const exerciseId = req.validatedParams.exerciseId;
    const getLanguages = await exerciseService.getExerciseLanguagesService(lessonId,exerciseId);
    res.status(200).json(getLanguages);

  }
  catch(error){
    next(error)
  }
};
export const getExerciseLanguageByIdController = async (req,res,next) => {
  try{
    const lessonId = req.validatedParams.lessonId;
    const exerciseId = req.validatedParams.exerciseId;
    const languageId = req.validatedParams.languageId;
    const getoneLanguage = await exerciseService.getExerciseLanguageByIdService(lessonId,exerciseId,languageId)
    res.status(200).json(getoneLanguage);

  }
  catch(error){
    next(error)
  }
};
export const updateExerciseLanguageController = async (req,res,next) => {
  try{
   const lessonId  = req.validatedParams.lessonId;
  const exerciseId = req.validatedParams.exerciseId;
  const languageId = req.validatedParams.languageId;
  const languageData = req.body;
  const updatedLanguage = await exerciseService.updateExerciseLanguageService(lessonId,exerciseId,languageId,languageData)
  res.status(200).json(updatedLanguage);

  }
  catch(error){
    next(error)
  }
};
export const deleteExerciseLanguageController = async (req,res,next) => {
  try{
    const lessonId = req.validatedParams.lessonId;
    const exerciseId = req.validatedParams.exerciseId;
    const languageId = req.validatedParams.languageId;
     await exerciseService.deleteExerciseLanguageService(lessonId,exerciseId,languageId);
    res.status(204).send();

  }
  catch(error){
    next(error)
  }
}