import { Navigate, Routes, Route } from 'react-router-dom'
import { AppShell, TabLayout, BareLayout } from './components/Layout'
import { RequireAuth, RequireAdmin } from './components/guards'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Explorer from './pages/Explorer'
import Categorie from './pages/Categorie'
import Humeur from './pages/Humeur'
import Programme from './pages/Programme'
import Recherche from './pages/Recherche'
import Lecteur from './pages/Lecteur'
import Article from './pages/Article'
import Pratique from './pages/Pratique'
import Experts from './pages/Experts'
import Favoris from './pages/Favoris'
import Profil from './pages/Profil'
import Paywall from './pages/Paywall'
import AdminLayout from './pages/admin/AdminLayout'
import AdminCours from './pages/admin/AdminCours'
import AdminProgrammes from './pages/admin/AdminProgrammes'
import AdminUtilisateurs from './pages/admin/AdminUtilisateurs'
import AdminAbonnements from './pages/admin/AdminAbonnements'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Seules routes publiques : l'application entière est derrière le login. */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        <Route element={<RequireAuth />}>
          {/* La racine renvoie sur /home, l'écran d'arrivée après connexion. */}
          <Route index element={<Navigate to="/home" replace />} />

          <Route element={<TabLayout />}>
            <Route path="home" element={<Home />} />
            <Route path="explorer" element={<Explorer />} />
            <Route path="categorie/:slug" element={<Categorie />} />
            <Route path="humeur/:key" element={<Humeur />} />
            <Route path="recherche" element={<Recherche />} />
            <Route path="experts" element={<Experts />} />
            <Route path="pratique" element={<Pratique />} />
            <Route path="favoris" element={<Favoris />} />
            <Route path="profil" element={<Profil />} />

            {/* Programme et article gardent la barre d'onglets : ce sont des
                pages de contenu, pas des parcours à part. */}
            <Route path="programme/:id" element={<Programme />} />
            <Route path="article/:id" element={<Article />} />
          </Route>

          <Route element={<BareLayout />}>
            {/* Le lecteur occupe l'écran entier, l'abonnement est un tunnel. */}
            <Route path="lecteur/:id" element={<Lecteur />} />
            <Route path="abonnement" element={<Paywall />} />

            <Route element={<RequireAdmin />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminCours />} />
                <Route path="programmes" element={<AdminProgrammes />} />
                <Route path="utilisateurs" element={<AdminUtilisateurs />} />
                <Route path="abonnements" element={<AdminAbonnements />} />
              </Route>
            </Route>
          </Route>

          {/* Chemin inconnu : retour à l'accueil plutôt qu'un écran blanc. */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
