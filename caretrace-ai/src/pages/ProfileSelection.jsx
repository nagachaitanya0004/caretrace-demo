import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import Card from '../components/Card';
import Button from '../components/Button';

function ProfileSelection() {
  const navigate = useNavigate();
  const { users, selectUser } = useContext(AppContext);

  const handleSelectUser = (id) => {
    selectUser(id);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4 fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center mt-8">Select Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(user => (
            <Card key={user.id} className="cursor-pointer hover:shadow-xl transition-shadow flex flex-col items-center justify-center p-8">
              <div 
                className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold mb-4"
                onClick={() => handleSelectUser(user.id)}
              >
                {user.profile.name ? user.profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <h2 className="text-xl font-semibold mb-2">{user.profile.name || 'Anonymous User'}</h2>
              <p className="text-gray-500 text-sm mb-4">
                {user.profile.age} years • {user.profile.gender}
              </p>
              <Button onClick={() => handleSelectUser(user.id)} className="w-full">
                Select Profile
              </Button>
            </Card>
          ))}

          <Card className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center p-8 bg-transparent shadow-none" onClick={() => navigate('/profile')}>
            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-3xl mb-4">
              +
            </div>
            <h2 className="text-lg font-medium text-gray-600">Add New Profile</h2>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProfileSelection;
