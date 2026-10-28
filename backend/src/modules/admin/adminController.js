export async function getAdminProfile(req, res, next) {
    try {
        return res.status(200).json({
            message: "Admin profile retrieved successfully.",
            user: {
                id: req.user.id,
                email: req.user.email,
            },
        });
    } catch (error) {
        return next(error);
    }
};
