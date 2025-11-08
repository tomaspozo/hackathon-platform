import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RootLayout } from '@/routes/root-layout'
import { RequireRole } from '@/routes/guards/require-role'
import { LandingPage } from '@/routes/landing'
import { ProfilePage } from '@/routes/profile'
import { AdminHackathonsPage } from '@/routes/admin/hackathons'
import { AdminJudgesPage } from '@/routes/admin/judges'
import { AdminTeamsPage } from '@/routes/admin/teams'
import { JudgingDashboardPage } from '@/routes/judging/dashboard'
import { NotFoundPage } from '@/routes/not-found'
import { ParticipantHackathonsPage } from '@/routes/participant/hackathons'
import { ParticipantSubmissionPage } from '@/routes/participant/submission'
import { ParticipantTeamPage } from '@/routes/participant/team'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<LandingPage />} />
          <Route
            path="profile"
            element={
              <RequireRole allowedRoles={['admin', 'participant', 'judge']}>
                <ProfilePage />
              </RequireRole>
            }
          />
          <Route
            path="admin/hackathons"
            element={
              <RequireRole allowedRoles={['admin']}>
                <AdminHackathonsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/teams"
            element={
              <RequireRole allowedRoles={['admin']}>
                <AdminTeamsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/judges"
            element={
              <RequireRole allowedRoles={['admin']}>
                <AdminJudgesPage />
              </RequireRole>
            }
          />
          <Route
            path="hackathons"
            element={
              <RequireRole allowedRoles={['participant']}>
                <ParticipantHackathonsPage />
              </RequireRole>
            }
          />
          <Route
            path="team"
            element={
              <RequireRole allowedRoles={['participant']}>
                <ParticipantTeamPage />
              </RequireRole>
            }
          />
          <Route
            path="submission"
            element={
              <RequireRole allowedRoles={['participant']}>
                <ParticipantSubmissionPage />
              </RequireRole>
            }
          />
          <Route
            path="judging"
            element={
              <RequireRole allowedRoles={['judge']}>
                <JudgingDashboardPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
