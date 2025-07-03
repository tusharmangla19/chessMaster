import { AIDifficulty } from './types';
import { Button } from '../ui/button';

interface DifficultySelectorProps {
    onDifficultySelect: (difficulty: AIDifficulty) => void;
    onBack: () => void;
}

const DIFFICULTY_OPTIONS: { value: AIDifficulty; label: string; description: string; color: string }[] = [
    {
        value: 'easy',
        label: 'Easy',
        description: 'Perfect for beginners. AI makes basic moves and occasional mistakes.',
        color: 'bg-green-500 hover:bg-green-600'
    },
    {
        value: 'medium',
        label: 'Medium',
        description: 'Good for intermediate players. AI plays strategically with some tactical awareness.',
        color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
        value: 'hard',
        label: 'Hard',
        description: 'Challenging for advanced players. AI uses advanced algorithms and deep thinking.',
        color: 'bg-red-500 hover:bg-red-600'
    }
];

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({ onDifficultySelect, onBack }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Select Difficulty</h1>
                    <p className="text-gray-300">Choose your AI opponent's skill level</p>
                </div>

                <div className="space-y-4 mb-8">
                    {DIFFICULTY_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => onDifficultySelect(option.value)}
                            className={`w-full p-4 rounded-xl border-2 border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-lg group ${option.color} text-white font-semibold`}
                        >
                            <div className="text-left">
                                <div className="text-lg font-bold mb-1">{option.label}</div>
                                <div className="text-sm opacity-90">{option.description}</div>
                            </div>
                        </button>
                    ))}
                </div>

                <Button
                    onClick={onBack}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                    ← Back to Menu
                </Button>
            </div>
        </div>
    );
}; 