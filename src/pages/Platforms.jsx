import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import { apiService } from '../services/apiService';

const filters = ['All', 'Beginner-friendly', 'ICPC-style', 'Interview Prep', 'Olympiad'];

const Platforms = () => {
  const [platformsData, setPlatformsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchPlatforms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPlatforms();
      setPlatformsData(data);
    } catch (err) {
      console.error("Error fetching platforms:", err);
      setError("Failed to load platforms. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const filteredPlatforms = platformsData.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'All' || p.tags.includes(activeFilter);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex flex-col gap-8 animate-pulse">
        <div className="h-10 w-48 bg-[var(--color-bg-secondary)] rounded-md"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {Array.from({ length: 8 }).map((_, i) => (
             <div key={i} className="h-32 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md"></div>
           ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.2)] rounded-lg p-8 max-w-[400px]">
          <h2 className="text-xl font-bold text-[var(--color-accent-red)] mb-2">Sync Error</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">{error}</p>
          <button 
            onClick={fetchPlatforms}
            className="px-6 py-2 bg-[var(--color-btn-primary-bg)] hover:bg-[var(--color-btn-primary-hover)] text-white font-medium rounded-md transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Hero Strip */}
      <div className="mb-8 border-b border-[var(--color-border-muted)] pb-8">
        <h1 className="text-[24px] font-semibold mb-2">Explore Platforms</h1>
        <p className="text-[var(--color-text-secondary)] mb-6">All major competitive programming judges, in one place</p>
        
        <div className="flex flex-col md:flex-row gap-4 max-w-[800px]">
          <div className="relative flex-1 max-w-[480px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
            <input 
              type="text" 
              placeholder="Search platforms..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md pl-9 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline focus:outline-2 focus:outline-[var(--color-accent-blue)] focus:outline-offset-1 transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  activeFilter === filter 
                    ? 'bg-[var(--color-btn-primary-bg)] border-[var(--color-btn-primary-border)] text-white' 
                    : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPlatforms.map((platform, i) => (
          <div 
            key={platform.id} 
            className="flex flex-col bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-4 card-hover"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div 
                className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0"
                style={{ backgroundColor: platform.color, backgroundImage: `linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0))` }}
              >
                {platform.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] leading-tight">{platform.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {platform.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <p className="text-[13px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-4 flex-1">
              {platform.desc}
            </p>
            
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--color-border-muted)]">
              <div className="flex items-center gap-3 font-mono text-xs text-[var(--color-text-muted)]">
                <span title="Problems"># {platform.problems}</span>
                <span title="Users">👤 {platform.users}</span>
              </div>
              
              <a 
                href="#" 
                className="flex items-center gap-1 text-[13px] font-medium text-[var(--color-accent-blue)] hover:underline"
              >
                Visit <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ))}
      </div>
      
      {filteredPlatforms.length === 0 && (
        <div className="text-center py-12 text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)] rounded-lg">
          No platforms match your search criteria.
        </div>
      )}
    </div>
  );
};

export default Platforms;
