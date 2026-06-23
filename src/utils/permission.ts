import { User, ManagementTerm } from '../types';

export function canEditCurrentManagementTerm(
  currentUser: User | null,
  activeTerm: ManagementTerm | null
): boolean {
  if (!currentUser) return false;
  
  // Rule: Admin can edit any management term
  if (currentUser.role === 'admin') return true;

  // Rule: Diretoria/Diretoria Admin can edit only if user.managementTermId matches activeTerm.id
  if (currentUser.role === 'diretoria' || currentUser.role === 'diretoria_admin') {
    if (!activeTerm) return false;
    return currentUser.managementTermId === activeTerm.id;
  }

  // Rule: Visualização can never edit
  return false;
}
