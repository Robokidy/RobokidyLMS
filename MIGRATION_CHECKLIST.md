# Unified CMS Migration Checklist

## Backend Setup

- [ ] Verify enhanced Lesson model is deployed (`/server/src/models/Lesson.js`)
- [ ] Verify enhanced Material model is deployed (`/server/src/models/Material.js`)
- [ ] Verify enhanced Quiz model is deployed (`/server/src/models/Quiz.js`)
- [ ] Verify enhanced Assignment model is deployed (`/server/src/models/Assignment.js`)
- [ ] Verify contentRoutes is registered in `index.js`
- [ ] Test content routes with Postman/Insomnia
  - [ ] GET /api/content/lessons
  - [ ] POST /api/content/lessons
  - [ ] PUT /api/content/lessons/:id
  - [ ] DELETE /api/content/lessons/:id
- [ ] Verify role-based filtering works
  - [ ] Admin can see all
  - [ ] Teacher sees only their scope
  - [ ] Student sees only published
- [ ] Run database migration if needed

## Frontend Module Setup

- [ ] Verify `/src/modules/shared/` directory exists
  - [ ] contentService.ts ✓
  - [ ] ContentList.tsx ✓
- [ ] Verify `/src/modules/curriculum/` directory exists
  - [ ] UnifiedCurriculumPage.tsx ✓
- [ ] Verify `/src/modules/materials/` directory exists
  - [ ] MaterialUploader.tsx ✓
  - [ ] UnifiedMaterialsPage.tsx ✓
- [ ] Verify `/src/modules/editors/` directory exists
  - [ ] LessonEditor.tsx ✓
- [ ] Verify `/src/modules/permissions/` directory exists
  - [ ] usePermissions.ts ✓

## Admin Portal Migration

- [ ] Backup original `AdminContentPage.tsx`
- [ ] Replace AdminContentPage.tsx with unified version
- [ ] Test curriculum page displays
- [ ] Test create lesson
- [ ] Test edit lesson
- [ ] Test delete lesson
- [ ] Test publish/unpublish
- [ ] Backup original `AdminMaterialsPage.tsx`
- [ ] Replace AdminMaterialsPage.tsx with unified version
- [ ] Test materials page displays
- [ ] Test upload material
- [ ] Test delete material
- [ ] Test material filters

## Teacher Portal Migration

- [ ] Backup original `CurriculumPage.tsx`
- [ ] Replace CurriculumPage.tsx with unified version
- [ ] Test teacher can see only their content
- [ ] Test teacher can create lessons
- [ ] Test teacher cannot edit admin's lessons
- [ ] Test teacher can publish to their scope
- [ ] Backup original `MaterialsPage.tsx`
- [ ] Replace MaterialsPage.tsx with unified version
- [ ] Test materials filtering
- [ ] Test upload limits
- [ ] Test class assignment

## Student Portal Migration

- [ ] Test student sees only published content
- [ ] Test student sees only assigned classes
- [ ] Test student cannot create content
- [ ] Test student cannot edit content
- [ ] Test student can view lessons
- [ ] Test student can access materials

## Integration Testing

### Lesson Management
- [ ] Admin creates lesson → visible to teacher
- [ ] Teacher creates lesson → visible to admin
- [ ] Unpublished lesson → not visible to student
- [ ] Published lesson → visible to assigned students
- [ ] Lesson order persists after reorder

### Materials Management
- [ ] Admin uploads material → visible to teacher
- [ ] Teacher uploads material → visible to admin
- [ ] Material appears in correct course
- [ ] Material appears in linked lesson
- [ ] Material appears to assigned classes

### Permissions
- [ ] Admin can edit anyone's content
- [ ] Teacher can edit only their own
- [ ] Student cannot edit anything
- [ ] Admin can see all content
- [ ] Teacher sees only scope
- [ ] Student sees only published

### Publishing Workflow
- [ ] Create draft lesson
- [ ] Verify it's draft status
- [ ] Publish lesson
- [ ] Verify it's published status
- [ ] Student can see published lesson
- [ ] Unpublish lesson
- [ ] Student cannot see unpublished lesson

## Performance Testing

- [ ] Load 1000 lessons → reasonable response time
- [ ] Search across large dataset → < 1 second
- [ ] Pagination works correctly
- [ ] Images load efficiently
- [ ] Video embeds don't block page

## Browser Compatibility

- [ ] Chrome/Edge latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Mobile browsers

## Error Handling

- [ ] Network error shows message
- [ ] Invalid input shows validation error
- [ ] Permission denied shows clear message
- [ ] Server error shows helpful message
- [ ] Empty states display properly

## Documentation

- [ ] UNIFIED_CMS_ARCHITECTURE.md ✓
- [ ] IMPLEMENTATION_GUIDE.md ✓
- [ ] Code comments added for complex logic
- [ ] API documentation updated
- [ ] README updated with new features

## Cleanup

- [ ] Remove unused old page components
- [ ] Remove unused old services (if any duplicated)
- [ ] Remove old CSS if not used
- [ ] Clean up imports in navigation files
- [ ] Remove development debugging code

## Deployment

- [ ] Code review completed
- [ ] Tests passing
- [ ] Build succeeds without errors
- [ ] Environment variables configured
- [ ] Database backups created
- [ ] Rollback plan documented
- [ ] Deploy to staging
- [ ] Smoke test staging
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Verify all features work in production

## Post-Deployment

- [ ] Monitor performance metrics
- [ ] Check error rates
- [ ] Verify user reports
- [ ] Document any issues
- [ ] Plan next phase features

## Success Criteria

✅ All pages use unified system  
✅ No API calls to old endpoints  
✅ 60%+ less code duplication  
✅ Same UX across admin/teacher  
✅ All tests passing  
✅ Zero data loss  
✅ Performance same or better  
✅ User feedback positive  

---

## Rollback Plan

If issues found in production:

1. Revert to last working commit
2. Run database rollback script
3. Clear browser cache
4. Redeploy previous version
5. Investigate issue
6. Document lesson learned

```bash
# Rollback commands
git revert <commit-hash>
npm run build
npm run deploy
```

---

## Notes & Issues Found

### Issue #1
- Description: 
- Status: 
- Resolution: 

### Issue #2
- Description: 
- Status: 
- Resolution: 

---

## Timeline

- Start Date: _______________
- Phase 1 (Backend): _______________
- Phase 2 (Frontend Modules): _______________
- Phase 3 (Admin Migration): _______________
- Phase 4 (Teacher Migration): _______________
- Phase 5 (Testing): _______________
- Phase 6 (Deployment): _______________
- Completion Date: _______________

---

## Sign Off

- [ ] Development Team Lead: _______________
- [ ] QA Lead: _______________
- [ ] Product Owner: _______________
- [ ] DevOps: _______________

Date: _______________
