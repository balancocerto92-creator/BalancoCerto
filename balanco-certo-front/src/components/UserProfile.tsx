// src/components/UserProfile.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type { AuthUser as User } from '@supabase/supabase-js';
import './UserProfile.css'; // Criaremos este CSS
import ProfileSettingsModal from './ProfileSettingsModal'; // O modal que acabamos de criar

interface UserProfileProps {
  onLogout: () => void;
  currentUser: User | null;
}

const UserProfile: React.FC<UserProfileProps> = ({ onLogout, currentUser }) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [profileFullName, setProfileFullName] = useState(currentUser?.user_metadata.full_name || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false); // Estado para o modal de configurações

  // Atualiza o nome e avatar quando o currentUser muda ou o perfil é atualizado
  useEffect(() => {
    const fetchProfileData = async () => {
      if (currentUser) {
        setProfileFullName(currentUser.user_metadata.full_name || '');
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', currentUser.id)
          .single();
        if (error) {
          console.error('Erro ao buscar avatar:', error);
          setProfileAvatarUrl(null);
        } else if (profile) {
          setProfileAvatarUrl(profile.avatar_url);
        }
      }
    };
    fetchProfileData();
  }, [currentUser]);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileUpdated = () => {
    // Recarregar os dados do perfil após a atualização no modal
    setSettingsModalOpen(false); // Fecha o modal
    setPopoverOpen(false); // Fecha o popover
    // Uma forma de garantir a atualização é forçar um reload do componente pai ou refetch do user
    // Por enquanto, vamos depender do useEffect para rebuscar o avatar
    // e setProfileFullName para o nome.
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!currentUser) return null;

  return (
    <div className="user-profile-container" ref={popoverRef}>
      <div className="user-profile-toggle" onClick={() => setPopoverOpen(!isPopoverOpen)}>
        {profileAvatarUrl ? (
          <img src={profileAvatarUrl} alt="Avatar" className="user-avatar" />
        ) : (
          <div className="user-avatar placeholder-avatar">
            {getInitials(profileFullName)}
          </div>
        )}
        <span className="user-name">{profileFullName}</span>
        <span className="dropdown-arrow"></span>
      </div>

      {isPopoverOpen && (
        <div className="user-profile-popover">
          <div className="popover-header">
            {profileAvatarUrl ? (
              <img src={profileAvatarUrl} alt="Avatar" className="user-avatar large" />
            ) : (
              <div className="user-avatar large placeholder-avatar">
                {getInitials(profileFullName)}
              </div>
            )}
            <div className="user-info">
              <span className="user-full-name">{profileFullName}</span>
              <span className="user-email">{currentUser.email}</span>
            </div>
          </div>
          <div className="popover-options">
            <button onClick={() => { setSettingsModalOpen(true); setPopoverOpen(false); }}>
              <span>⚙️</span> Configurações do Perfil
            </button>
            <button onClick={onLogout}>
              <span>🚪</span> Sair
            </button>
          </div>
        </div>
      )}

      <ProfileSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
};

export default UserProfile;