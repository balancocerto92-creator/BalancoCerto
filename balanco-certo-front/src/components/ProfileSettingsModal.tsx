// src/components/ProfileSettingsModal.tsx
// Versão completa e final com todos os ajustes solicitados.

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { AuthUser as User } from '@supabase/supabase-js';

// Importações da biblioteca de telefone
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css'; // Estilos base da biblioteca

import './ProfileSettingsModal.css'; // Seus estilos personalizados

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onProfileUpdated: () => void;
}

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose, currentUser, onProfileUpdated }) => {
  const [loading, setLoading] = useState(false);
  
  // Estados do formulário
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>('');
  const [documentNumber, setDocumentNumber] = useState(''); // Representa o CPF

  // Busca os dados do perfil quando o modal é aberto
  useEffect(() => {
    if (isOpen && currentUser) {
      setLoading(true);
      setMessage('');
      setNewPassword('');
      setConfirmPassword('');

      const fetchProfile = async () => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, date_of_birth, phone_number, document_number')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error("Erro ao buscar perfil:", error);
          setMessage('Erro ao carregar seu perfil.');
        } else if (profile) {
          setFullName(profile.full_name || '');
          setAvatarUrl(profile.avatar_url);
          setBirthDate(profile.date_of_birth || '');
          setPhoneNumber(profile.phone_number || '');
          setDocumentNumber(profile.document_number || '');
        }
        setLoading(false);
      };
      fetchProfile();
    }
  }, [isOpen, currentUser]);

  // Função para salvar os dados pessoais
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setLoading(true);
    setMessage('Salvando...');
    
    const profileData = {
      full_name: fullName,
      date_of_birth: birthDate,
      phone_number: phoneNumber,
      document_number: documentNumber,
    };

    const { error } = await supabase.from('profiles').update(profileData).eq('id', currentUser.id);
    
    if (error) {
      setMessage('Erro ao atualizar o perfil.');
    } else {
      setMessage('Perfil atualizado com sucesso!');
      onProfileUpdated();
    }
    setLoading(false);
  };

  // Função para alterar a senha
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setMessage('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setMessage('Atualizando senha...');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage('Erro ao atualizar a senha: ' + error.message);
    } else {
      setMessage('Senha atualizada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };
  
  // Função para fazer upload da foto de perfil
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentUser) {
      return;
    }
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${currentUser.id}/${Math.random()}.${fileExt}`;

    setLoading(true);
    setMessage('Enviando foto...');
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage('Erro ao enviar a foto.');
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
    if (updateError) {
      setMessage('Erro ao salvar a URL da foto.');
    } else {
      setAvatarUrl(publicUrl);
      setMessage('Foto de perfil atualizada!');
      onProfileUpdated();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configurações do Perfil</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          {loading && <p className="loading-message">Carregando...</p>}
          {!loading && (
            <div className="settings-grid">
              {/* Card de Dados Pessoais */}
              <div className="content-card">
                <h3>Dados Pessoais</h3>
                <form onSubmit={handleUpdateProfile} className="settings-form">
                  <div className="avatar-upload-section">
                    <img src={avatarUrl || `https://ui-avatars.com/api/?name=${fullName || 'S'}&background=random&color=fff`} alt="Avatar" className="avatar-preview" />
                    <div>
                      <label htmlFor="avatar-file" className="button-secondary">Escolher Arquivo</label>
                      <input type="file" id="avatar-file" accept="image/*" onChange={handleAvatarUpload} style={{display: 'none'}} />
                    </div>
                  </div>
                  
                  <label htmlFor="email">E-mail</label>
                  <input id="email" type="text" value={currentUser?.email || ''} disabled />
                  
                  <label htmlFor="fullName">Nome Completo</label>
                  <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  
                  <label htmlFor="birthDate">Data de Nascimento</label>
                  <input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  
                  <label htmlFor="phoneNumber">Celular para Contato</label>
                  <PhoneInput
                    id="phoneNumber"
                    international
                    withCountryCallingCode
                    placeholder="Número de celular"
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    defaultCountry="BR"
                    className="phone-input-container"
                  />
                  
                  <label htmlFor="documentNumber">CPF</label>
                  <input 
                    id="documentNumber" 
                    type="text" 
                    placeholder="000.000.000-00" 
                    value={documentNumber} 
                    onChange={(e) => setDocumentNumber(e.target.value)} 
                  />
                  
                  <button type="submit" className="cta-button" disabled={loading}>Salvar Alterações</button>
                </form>
              </div>

              {/* Card de Alterar Senha */}
              <div className="content-card">
                <h3>Alterar Senha</h3>
                <form onSubmit={handleUpdatePassword} className="settings-form">
                  <label htmlFor="newPassword">Nova Senha</label>
                  <input id="newPassword" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                  <input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <button type="submit" className="cta-button" disabled={loading}>Atualizar Senha</button>
                </form>
              </div>
            </div>
          )}
          {message && <p className="form-message">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;