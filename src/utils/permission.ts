import { User, ManagementTerm } from '../types';

export function canEditCurrentManagementTerm(
  currentUser: User | null,
  activeTerm: ManagementTerm | null
): boolean {
  if (!currentUser) return false;
  
  // Rule: Admin can edit any management term
  if (currentUser.role === 'admin') return true;

  // Rule: Diretoria can edit only if user.managementTermId matches activeTerm.id
  if (currentUser.role === 'diretoria') {
    if (!activeTerm) return false;
    return currentUser.managementTermId === activeTerm.id;
  }

  // Rule: Visualização can never edit
  return false;
}
