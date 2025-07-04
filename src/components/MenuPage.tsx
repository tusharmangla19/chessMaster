'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Bot,
  Crown,
  Zap,
  Timer,
  Copy,
  Check,
  Search,
  Settings,
  Trophy,
  Star,
  Play
} from 'lucide-react';

interface MenuPageProps {
  onStartSinglePlayer?: () => void;
  onStartMultiplayer?: () => void;
  onCreateRoom?: () => void;
  onJoinRoom?: (roomId: string) => void;
}

export default function MenuPage({
  onStartSinglePlayer,
  onStartMultiplayer,
  onCreateRoom,
  onJoinRoom
}: MenuPageProps) {
  const [roomCode, setRoomCode] = useState('');
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [generatedRoomCode, setGeneratedRoomCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = () => {
    const newRoomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    setGeneratedRoomCode(newRoomCode);
    if (onCreateRoom) onCreateRoom();
  };

  const handleJoinRoom = () => {
    if (roomCode.trim() && onJoinRoom) {
      onJoinRoom(roomCode.trim());
      setIsJoinRoomOpen(false);
      setRoomCode('');
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(generatedRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gameOptions = [
    {
      id: 'single-player',
      title: 'Play vs AI',
      description: 'Challenge our intelligent computer opponents',
      icon: Bot,
      color: 'from-purple-500 to-purple-700',
      badge: 'Popular',
      badgeColor: 'bg-green-500',
      onClick: onStartSinglePlayer,
      features: ['3 Difficulty Levels', 'Smart AI', 'Practice Mode']
    },
    {
      id: 'multiplayer',
      title: 'Find Opponent',
      description: 'Get matched with players instantly',
      icon: Users,
      color: 'from-blue-500 to-blue-700',
      badge: 'Quick',
      badgeColor: 'bg-blue-500',
      onClick: onStartMultiplayer,
      features: ['Instant Matching', 'Video Calls', 'Real-time Play']
    },
    {
      id: 'create-room',
      title: 'Create Room',
      description: 'Start a private game with friends',
      icon: Crown,
      color: 'from-amber-500 to-amber-700',
      badge: 'Private',
      badgeColor: 'bg-amber-500',
      onClick: () => setIsCreateRoomOpen(true),
      features: ['Custom Room Code', 'Invite Friends', 'Private Games']
    },
    {
      id: 'join-room',
      title: 'Join Room',
      description: 'Enter a room code to join a game',
      icon: Search,
      color: 'from-emerald-500 to-emerald-700',
      badge: 'Connect',
      badgeColor: 'bg-emerald-500',
      onClick: () => setIsJoinRoomOpen(true),
      features: ['Room Code Entry', 'Quick Join', 'Friend Games']
    }
  ];

  const stats = [
    { label: 'Active Players', value: '12,453', icon: Users },
    { label: 'Games Today', value: '8,721', icon: Play },
    { label: 'Online Now', value: '2,156', icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">♔</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Chess<span className="text-purple-400">Master</span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Choose your game mode and start your chess journey
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <stat.icon className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-gray-300">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Game Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gameOptions.map((option) => (
            <Card 
              key={option.id} 
              className="group bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden"
              onClick={option.onClick}
            >
              <CardHeader className="relative">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${option.color}`} />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${option.color} shadow-lg`}>
                      <option.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white group-hover:text-purple-300 transition-colors">
                        {option.title}
                      </CardTitle>
                      <CardDescription className="text-gray-300 mt-1">
                        {option.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`${option.badgeColor} text-white border-0`}>
                    {option.badge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                      <Star className="h-3 w-3 text-purple-400" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Separator className="my-4 bg-white/10" />
                <Button 
                  className={`w-full bg-gradient-to-r ${option.color} hover:opacity-90 text-white border-0`}
                  onClick={(e) => {
                    e.stopPropagation();
                    option.onClick?.();
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Playing
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400/10">
                <Trophy className="h-4 w-4 mr-2" />
                View Leaderboard
              </Button>
              <Button variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400/10">
                <Timer className="h-4 w-4 mr-2" />
                Game History
              </Button>
              <Button variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400/10">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Room Dialog */}
        <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
          <DialogContent className="bg-slate-900 border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Create Private Room
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Create a private room and share the code with your friends
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button onClick={handleCreateRoom} className="w-full bg-gradient-to-r from-amber-500 to-amber-600">
                Generate Room Code
              </Button>
              {generatedRoomCode && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">Your room code:</p>
                  <div className="flex items-center gap-2 p-3 bg-white/10 rounded-lg">
                    <code className="text-2xl font-bold text-amber-400 flex-1">
                      {generatedRoomCode}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyRoomCode}
                      className="border-amber-400 text-amber-400"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Share this code with your friends to join your game
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Join Room Dialog */}
        <Dialog open={isJoinRoomOpen} onOpenChange={setIsJoinRoomOpen}>
          <DialogContent className="bg-slate-900 border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-emerald-500" />
                Join Room
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Enter the room code to join a private game
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Room Code</label>
                <Input
                  placeholder="Enter 6-character room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  maxLength={6}
                />
              </div>
              <Button 
                onClick={handleJoinRoom} 
                disabled={roomCode.length !== 6}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600"
              >
                Join Game
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 