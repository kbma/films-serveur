const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const Film = require('./filmSchema');
const User = require('./userSchema'); 
const Abonnement = require('./abonnementSchema');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const cors = require('cors');
app.use(cors());

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/films').then(() => {
  console.log('Connecté à MongoDB');
}).catch(err => {
  console.error('Erreur de connexion à MongoDB :', err);
});

// Charger le fichier Excel et synchroniser avec MongoDB
async function syncExcelToMongoDB() {
  console.log('Lecture du fichier Excel...');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile('films.xlsx');
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier Excel :', error);
    return;
  }
  
  // Supposons que la feuille de calcul contient des données dans la première feuille
  const worksheet = workbook.getWorksheet(1);

  worksheet.eachRow(async (row, rowNumber) => {
    console.log(`Lecture de la ligne ${rowNumber}...`);
    // Convertir chaque ligne Excel en objet à insérer dans MongoDB
    const data = {
      id: row.getCell(1).value,
      titre: row.getCell(2).value,
      titreOriginal: row.getCell(3).value,
      réalisateurs: row.getCell(4).value,
      annéeProduction: row.getCell(5).value,
      nationalité: row.getCell(6).value,
      durée: row.getCell(7).value,
      genre: row.getCell(8).value,
      synopsis: row.getCell(9).value
    };

    console.log('Données extraites de la ligne :', data);

    // Insérer ou mettre à jour dans MongoDB
    try {
      await Film.updateOne({ id: data.id }, data, { upsert: true });
      console.log(`Ligne ${rowNumber} synchronisée avec MongoDB`);
    } catch (error) {
      console.error(`Erreur lors de la synchronisation de la ligne ${rowNumber} :`, error);
    }
  });

  console.log('Synchronisation terminée.');
}


// Route pour l'inscription d'un utilisateur
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Vérifier si tous les champs nécessaires sont présents
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  try {
    const newUser = new User({ username, email, password });
    await newUser.save();
    return res.status(201).json({ message: 'Utilisateur inscrit avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l\'inscription de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur lors de l\'inscription de l\'utilisateur.' });
  }
});



// Route pour la connexion d'un utilisateur
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Vérifier si tous les champs nécessaires sont présents
  if (!username || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  try {
    // Trouver l'utilisateur dans la base de données par son username
    const user = await User.findOne({ username });

    // Si l'utilisateur n'existe pas ou si le mot de passe est incorrect
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    // Générer le token d'authentification
    const token = generateAuthToken(user._id);

    return res.status(200).json({ token });
  } catch (error) {
    console.error('Erreur lors de la connexion de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur lors de la connexion de l\'utilisateur.' });
  }
});
// Fonction pour générer le token d'authentification
function generateAuthToken(userId) {
  // Implémenter la génération de token ici
  // Cela peut être une méthode de hachage sécurisée ou toute autre méthode que vous souhaitez utiliser pour générer des tokens d'authentification
  return userId.toString(); // C'est une implémentation simpliste. NE PAS UTILISER EN PRODUCTION.
}



/* api films */

// Fonction pour récupérer les détails d'un film en fonction de son nom
const fetchMovieDetails = async (movieName) => {
  try {
    const apiKey = '2fc897bfac1ac919a113dfba8287f20d'; // Votre clé API ici
    const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(movieName)}&include_adult=false&language=en-US&page=1&api_key=${apiKey}`;
    console.log(url);
    const response = await fetch(url);
    const json = await response.json();
    return json.results[0]; // Récupérer le premier résultat (film) trouvé
  } catch (error) {
    console.error('Erreur:', error);
    return null;
  }
};


// Route pour récupérer la liste paginée des films avec plus de détails
app.get('/films', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Récupère le numéro de page depuis la requête, sinon utilise la première page par défaut
  const limit = parseInt(req.query.limit) || 100; // Récupère le nombre d'éléments par page depuis la requête, sinon utilise 10 éléments par défaut

  try {
    const totalCount = await Film.countDocuments(); // Compte le nombre total de films dans la base de données
    const totalPages = Math.ceil(totalCount / limit); // Calcule le nombre total de pages en fonction du nombre total de films et du nombre d'éléments par page
    const skip = (page - 1) * limit; // Calcule le nombre d'éléments à ignorer pour la pagination

    const films = await Film.find().skip(skip).limit(limit); // Récupère les films en fonction de la pagination
    console.log(films);
    // Récupérer les détails supplémentaires pour chaque film
    const filmsWithDetails = await Promise.all(films.map(async (film) => {
      
      const movieDetails = await fetchMovieDetails(film.titre); // Récupérer les détails du film en utilisant son nom
      return { ...film.toObject(), details: movieDetails }; // Ajouter les détails supplémentaires au film
    }));

    res.json({
      data: filmsWithDetails,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des films :', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des films.' });
  }
});




/* API pour gerer les favoris, vu, aVoir
 */


// Route pour ajouter un film à la liste de favoris, de films vus ou de films à voir pour un utilisateur spécifique
app.post('/abonnement/:userId/:filmId', async (req, res) => {
  const { userId, filmId } = req.params;
  const { favori, vu, aVoir } = req.body;

  try {
    // Recherche de l'abonnement existant de l'utilisateur au film
    let abonnement = await Abonnement.findOne({ userId, filmId });

    // Si l'abonnement n'existe pas, créez-le
    if (!abonnement) {
      abonnement = new Abonnement({ userId, filmId });
    }

    // Mettez à jour les champs en fonction des données de la requête
    abonnement.favori = favori || false;
    abonnement.vu = vu || false;
    abonnement.aVoir = aVoir || false;

    // Enregistrez l'abonnement dans la base de données
    await abonnement.save();

    res.status(200).json({ message: 'Film ajouté avec succès à la liste.' });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du film à la liste :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'ajout du film à la liste.' });
  }
});






// Route pour récupérer l'état d'abonnement d'un utilisateur à un film
app.get('/abonnement/:userId/:filmId', async (req, res) => {
  const { userId, filmId } = req.params;

  try {
    // Recherche de l'abonnement existant de l'utilisateur au film
    const abonnement = await Abonnement.findOne({ userId, filmId });

    // Si l'abonnement existe, renvoyer ses données
    if (abonnement) {
      res.status(200).json({
        favori: abonnement.favori,
        vu: abonnement.vu,
        aVoir: abonnement.aVoir
      });
    } else {
      // Si l'abonnement n'existe pas, renvoyer null
      res.status(200).json(null);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'abonnement :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération de l\'abonnement.' });
  }
});






// Appeler la fonction pour démarrer la synchronisation
syncExcelToMongoDB();
var periode =60000*60;  // 1 heure
setInterval(syncExcelToMongoDB, periode);


// Démarrer le serveur Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});