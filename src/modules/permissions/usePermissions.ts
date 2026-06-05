import { useAuth } from "@/context/AuthContext";

export type UserRole = "admin" | "cto" | "cmo" | "teacher" | "student" | "parent";

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  publish: boolean;
}

/**
 * usePermissions Hook
 * Frontend role-based access control
 * Used to conditionally render UI elements based on user permissions
 */
export const usePermissions = () => {
  const { user } = useAuth();

  const isAdmin = () => user?.role === "admin";
  const isCto = () => user?.role === "cto";
  const isCmo = () => user?.role === "cmo";
  const isTeacher = () => user?.role === "teacher";
  const isStudent = () => user?.role === "student";
  const isParent = () => user?.role === "parent";

  const canViewContent = (): boolean => {
    return !!(user && ["admin", "teacher", "student"].includes(user.role));
  };

  const canCreateContent = (): boolean => {
    return !!(user && ["admin", "teacher"].includes(user.role));
  };

  const canEditContent = (createdById: string): boolean => {
    if (!user) return false;
    if (isAdmin()) return true;
    if (isTeacher() && user._id === createdById) return true;
    return false;
  };

  const canDeleteContent = (createdById: string): boolean => {
    if (!user) return false;
    if (isAdmin()) return true;
    if (isTeacher() && user._id === createdById) return true;
    return false;
  };

  const canPublishContent = (createdById: string): boolean => {
    if (!user) return false;
    if (isAdmin()) return true;
    if (isTeacher() && user._id === createdById) return true;
    return false;
  };

  const canManageMaterials = (): boolean => {
    return !!(user && ["admin", "teacher"].includes(user.role));
  };

  const canUploadMaterials = (): boolean => {
    return !!(user && ["admin", "teacher"].includes(user.role));
  };

  const canGradeAssignments = (): boolean => {
    return !!(user && ["admin", "teacher"].includes(user.role));
  };

  const canViewAnalytics = (): boolean => {
    return !!(user && ["admin", "teacher"].includes(user.role));
  };

  const canManageUsers = (): boolean => {
    return isAdmin();
  };

  const canManageSchools = (): boolean => {
    return isAdmin();
  };

  const getContentPermissions = (createdById: string): Permission => {
    return {
      view: canViewContent(),
      create: canCreateContent(),
      edit: canEditContent(createdById),
      delete: canDeleteContent(createdById),
      publish: canPublishContent(createdById),
    };
  };

  const shouldShowAdminPanel = (): boolean => {
    return isAdmin();
  };

  const shouldShowTeacherPanel = (): boolean => {
    return isTeacher();
  };

  const shouldShowStudentPanel = (): boolean => {
    return isStudent();
  };

  return {
    // Role checks
    isAdmin,
    isCto,
    isCmo,
    isTeacher,
    isStudent,
    isParent,
    
    // Content permissions
    canViewContent,
    canCreateContent,
    canEditContent,
    canDeleteContent,
    canPublishContent,
    
    // Materials permissions
    canManageMaterials,
    canUploadMaterials,
    
    // Assignment permissions
    canGradeAssignments,
    
    // Analytics permissions
    canViewAnalytics,
    
    // Admin permissions
    canManageUsers,
    canManageSchools,
    
    // Combined permissions
    getContentPermissions,
    
    // Panel display
    shouldShowAdminPanel,
    shouldShowTeacherPanel,
    shouldShowStudentPanel,
  };
};

export default usePermissions;
