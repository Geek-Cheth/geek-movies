import React, { useEffect, useState } from 'react'
import Search from './components/Search.jsx'
import Spinner from './components/Spinner.jsx'
import MovieCard from './components/MovieCard.jsx'
import { useDebounce } from 'react-use'
import { updateSearchCount } from './appwrite.js'
import { getTrendingMovies } from './appwrite.js'


const API_BASE_URL = 'https://api.themoviedb.org/3';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  },
}



const App = () => {

  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [movieList, setMovieList] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce the search term so that we don't send a request on every key stroke
  // This will wait for the user to stop typing for 800ms before sending a request
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 2000, [searchTerm]);
  
  const fetchMovies = async (query = '', page = 1, append = false) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const endpoint = query 
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&page=${page}`;

      const response = await fetch(endpoint, API_OPTIONS);

      if(!response.ok) {
        throw new Error('Failed to fetch movies');
      }

      const data = await response.json();

      if(data.response == 'False'){
        setErrorMessage(data.Error) || 'Failed to fetch movies';
        setMovieList([]);
        return;
      }

      if (append) {
        setMovieList(prev => [...prev, ...(data.results || [])]);
      } else {
        setMovieList(data.results || []);
      }
      
      setHasMorePages(data.page < data.total_pages);

      if(query && data.results.length > 0) {
        await updateSearchCount(query, data.results[0]);
      }

    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage('Error fetching movies. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies();

      setTrendingMovies(movies);

    }catch (error) {
      console.error(`Error fetching trending movies: ${error}`);
    }
  }


  useEffect(() => {
    setCurrentPage(1);
    fetchMovies(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchMovies(debouncedSearchTerm, nextPage, true);
  };

  useEffect(() => {
    loadTrendingMovies();
  }, []);

  return (
    <main>
      <div className="pattern" />

      <div className="wrapper">
        <header>
          <img src='./hero.png' alt="Hero Banner"/>
          <h1>Find <span className="text-gradient">Movies</span> You'll Enjoy Without the Hassle</h1>
        
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm}/>
        
        </header>

        {trendingMovies.length > 0 && (

          <section className='trending'>
            <h2>Trending Movies</h2>
            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.title} />

                </li>
              ))}
            </ul>
          </section>
        )}

        
        <section className='all-movies'>
          <h2>All Movies</h2>

          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          
          )}


          {!isLoading && !errorMessage && hasMorePages && (
            <button
              onClick={handleLoadMore}
              className="mt-8 px-6 py-3 bg-gradient-to-r from-[#ff3366] to-[#ff9933] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Load More
            </button>
          )}
          {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        </section>
      </div>
    </main>
  )
}

export default App
