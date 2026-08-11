'use strict';

const Project = require('../models/Project');
const ProjectRole = require('../models/ProjectRole');

/**
 * Middleware to enforce role-based access control (RBAC) on a project resource.
 * Checks if the logged-in user (req.user.id) has a role matching the allowed roles.
 * Expects project ID to be in req.params.id, req.params.projectId, req.query.projectId, or req.body.projectId.
 * Owner (creator of the project) always has full Admin access.
 * 
 * @param {Array<string>} allowedRoles - e.g., ['Admin', 'Member']
 */
const checkRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId || req.query.projectId || req.body.projectId;
      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required to verify permissions.' });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found.' });
      }

      // Project Owner (creator) has bypass access
      if (project.createdBy.toString() === req.user.id) {
        return next();
      }

      // Check for explicitly assigned roles
      const userRoleMapping = await ProjectRole.findOne({ projectId, userId: req.user.id });
      if (!userRoleMapping) {
        return res.status(403).json({ message: 'Access denied. You do not have permissions for this project.' });
      }

      const userRole = userRoleMapping.role; // 'Admin', 'Member', or 'Viewer'

      if (allowedRoles.includes(userRole)) {
        return next();
      }

      return res.status(403).json({
        message: `Access denied. Role "${userRole}" has insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
      });
    } catch (err) {
      console.error('❗ [checkRole Middleware] Error:', err.message);
      next(err);
    }
  };
};

module.exports = checkRole;
