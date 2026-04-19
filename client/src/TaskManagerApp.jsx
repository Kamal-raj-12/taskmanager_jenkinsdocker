import React, { useState, useEffect } from 'react';
import { User, LogOut, Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle, Upload, MessageCircle, Send, Lock, FileText, TrendingUp, Calendar, Users, BarChart3, Bell, Workflow } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Auth from './Auth';
import * as api from './services/api';

const TaskManagerApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allEmployeeProjects, setAllEmployeeProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToUpdateStatus, setTaskToUpdateStatus] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [taskToReassign, setTaskToReassign] = useState(null);
  const [reassignmentSuggestions, setReassignmentSuggestions] = useState([]);

  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [taskForm, setTaskForm] = useState({ title: '', assignedTo: [], sequenceOrder: '', dueDate: '' });
  const [messageText, setMessageText] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        loadData();
      } catch (err) {
        console.error('Invalid session:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (user.role === 'admin') {
        const [usersRes, projectsRes, allTasksRes] = await Promise.all([
          api.getUsers(),
          api.getProjects(),
          api.getAllEmployeeTasks() // Fetch ALL tasks
        ]);
        
        setUsers(usersRes.data);
        setProjects(projectsRes.data);
        setAllEmployeeProjects(allTasksRes.data); // Store globally
      } else {
        // Employee code remains the same
        const [usersRes, projectsRes] = await Promise.all([
          api.getUsers(),
          api.getProjects()
        ]);
        
        setUsers(usersRes.data);
        setProjects(projectsRes.data);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setUsers([]);
    setProjects([]);
    setAllEmployeeProjects([]);
  };

  // Workload Management Functions
  const calculateWorkloadScore = (employeeId) => {
    const projectsToUse = currentUser.role === 'admin' ? allEmployeeProjects : projects;
    const allTasks = projectsToUse.flatMap(p => p.tasks.filter(t => 
      t.assignedTo.some(assigned => (assigned._id || assigned) === employeeId)
    ));
    
    const pending = allTasks.filter(t => t.status === 'pending').length;
    const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    
    // Scoring system: pending tasks weigh more than in-progress, completed weigh least
    const score = (pending * 3) + (inProgress * 2) + (completed * 0);
    return {
      score: Math.round(score * 10) / 10,
      pending,
      inProgress,
      completed,
      total: allTasks.length
    };
  };

  const getReassignmentSuggestions = (currentTask) => {
    const currentAssignees = currentTask.assignedTo.map(assigned => assigned._id || assigned);
    
    const suggestions = users
      .filter(user => user.role === 'employee' && !currentAssignees.includes(user._id))
      .map(employee => {
        const workload = calculateWorkloadScore(employee._id);
        return {
          employee,
          workload,
          currentAssignees: currentAssignees
        };
      })
      .sort((a, b) => a.workload.score - b.workload.score); // Sort by workload score (lowest first)
    
    return suggestions;
  };

  const handleReassignTask = async (projectId, taskId, newAssigneeId) => {
    try {
      // Replace all assignees with the new one (complete reassignment)
      const updatedAssignedTo = [newAssigneeId];
      
      const response = await api.updateTask(projectId, taskId, {
        assignedTo: updatedAssignedTo
      });
      
      setProjects(projects.map(p => p._id === projectId ? response.data : p));
      setTaskToReassign(null);
      setReassignmentSuggestions([]);
    } catch (err) {
      alert('Failed to reassign task: ' + (err.response?.data?.error || err.message));
    }
  };

  const openReassignmentModal = (task) => {
    setTaskToReassign(task);
    const suggestions = getReassignmentSuggestions(task);
    setReassignmentSuggestions(suggestions);
  };

  const getWorkloadBadgeColor = (score) => {
    if (score > 15) return 'bg-red-100 text-red-700 border-red-300';
    if (score > 8) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };

  const getWorkloadLevel = (score) => {
    if (score > 15) return 'High';
    if (score > 8) return 'Medium';
    return 'Low';
  };

  const getEmployeeStats = (employeeId) => {
    const projectsToUse = currentUser.role === 'admin' ? allEmployeeProjects : projects;
    const allTasks = projectsToUse.flatMap(p => p.tasks.filter(t => 
      t.assignedTo.some(assigned => (assigned._id || assigned) === employeeId)
    ));
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
    const pending = allTasks.filter(t => t.status === 'pending').length;
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const weekCompleted = allTasks.filter(t => 
      t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= weekAgo
    ).length;
    
    const monthCompleted = allTasks.filter(t => 
      t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= monthAgo
    ).length;

    return { total: allTasks.length, completed, inProgress, pending, weekCompleted, monthCompleted };
  };

  const getWeeklyData = (employeeId) => {
    const projectsToUse = currentUser.role === 'admin' ? allEmployeeProjects : projects;
    const allTasks = projectsToUse.flatMap(p => p.tasks.filter(t => 
      t.assignedTo.some(assigned => (assigned._id || assigned) === employeeId) && t.completedAt
    ));
    const now = new Date();
    const weekData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const completedTasks = allTasks.filter(t => {
        const completedDate = new Date(t.completedAt);
        return completedDate >= dayStart && completedDate <= dayEnd;
      }).length;
      
      weekData.push({
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayStart.getDay()],
        tasks: completedTasks
      });
    }
    
    return weekData;
  };

  const getMonthlyData = (employeeId) => {
    const projectsToUse = currentUser.role === 'admin' ? allEmployeeProjects : projects;
    const allTasks = projectsToUse.flatMap(p => p.tasks.filter(t => 
      t.assignedTo.some(assigned => (assigned._id || assigned) === employeeId) && t.completedAt
    ));
    const now = new Date();
    const monthData = [];
    
    for (let i = 29; i >= 0; i -= 5) {
      const endDay = Math.max(0, i - 4);
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const weekStart = new Date(date.setHours(0, 0, 0, 0));
      const weekEnd = new Date(now.getTime() - endDay * 24 * 60 * 60 * 1000);
      weekEnd.setHours(23, 59, 59, 999);
      
      const completedTasks = allTasks.filter(t => {
        const completedDate = new Date(t.completedAt);
        return completedDate >= weekStart && completedDate <= weekEnd;
      }).length;
      
      monthData.push({
        week: `Week ${6 - Math.floor(i / 5)}`,
        tasks: completedTasks
      });
    }
    
    return monthData;
  };

  const getUpcomingReminders = (employeeId) => {
    const projectsToUse = currentUser.role === 'admin' ? allEmployeeProjects : projects;
    const allTasks = projectsToUse.flatMap(p => p.tasks
      .filter(t => t.assignedTo.some(assigned => (assigned._id || assigned) === employeeId) && 
                   t.status !== 'completed' && t.dueDate)
      .map(t => ({...t, projectName: p.name}))
    );
    
    const now = new Date();
    
    return allTasks.filter(task => {
      const dueDate = new Date(task.dueDate);
      const dayBeforeDue = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
      return now >= dayBeforeDue && now <= dueDate;
    });
  };

  const handleAddProject = async () => {
    if (!projectForm.name) return;
    
    try {
      const response = await api.createProject({
        name: projectForm.name,
        description: projectForm.description,
        tasks: []
      });
      
      setProjects([...projects, response.data]);
      setProjectForm({ name: '', description: '' });
      setShowProjectModal(false);
    } catch (err) {
      alert('Failed to create project: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditProject = async () => {
    try {
      const response = await api.updateProject(editingProject._id, {
        name: projectForm.name,
        description: projectForm.description
      });
      
      setProjects(projects.map(p => p._id === editingProject._id ? response.data : p));
      setProjectForm({ name: '', description: '' });
      setEditingProject(null);
      setShowProjectModal(false);
    } catch (err) {
      alert('Failed to update project: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await api.deleteProject(projectId);
      setProjects(projects.filter(p => p._id !== projectId));
    } catch (err) {
      alert('Failed to delete project: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddTask = async () => {
    if (!taskForm.title || taskForm.assignedTo.length === 0) return;
    
    try {
      const taskData = {
        title: taskForm.title,
        status: 'pending',
        assignedTo: taskForm.assignedTo,
        files: [],
        messages: [],
        sequenceOrder: parseInt(taskForm.sequenceOrder) || 1,
        dueDate: taskForm.dueDate || null
      };
      
      const response = await api.addTask(selectedProjectId, taskData);
      setProjects(projects.map(p => p._id === selectedProjectId ? response.data : p));
      setTaskForm({ title: '', assignedTo: [], sequenceOrder: '', dueDate: '' });
      setShowTaskModal(false);
    } catch (err) {
      alert('Failed to add task: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditTask = async () => {
    try {
      const taskData = {
        title: taskForm.title,
        assignedTo: taskForm.assignedTo,
        sequenceOrder: parseInt(taskForm.sequenceOrder) || editingTask.sequenceOrder,
        dueDate: taskForm.dueDate || editingTask.dueDate
      };
      
      const projectId = projects.find(p => p.tasks.some(t => t._id === editingTask._id))._id;
      const response = await api.updateTask(projectId, editingTask._id, taskData);
      
      setProjects(projects.map(p => p._id === projectId ? response.data : p));
      setTaskForm({ title: '', assignedTo: [], sequenceOrder: '', dueDate: '' });
      setEditingTask(null);
      setShowTaskModal(false);
    } catch (err) {
      alert('Failed to update task: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteTask = async (projectId, taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const response = await api.deleteTask(projectId, taskId);
      setProjects(projects.map(p => p._id === projectId ? response.data : p));
    } catch (err) {
      alert('Failed to delete task: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateTaskStatus = async (projectId, taskId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
      };
      
      const response = await api.updateTask(projectId, taskId, updateData);
      setProjects(projects.map(p => p._id === projectId ? response.data : p));
      setShowStatusModal(false);
      setTaskToUpdateStatus(null);
    } catch (err) {
      alert('Failed to update task status: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    try {
      const projectId = projects.find(p => p.tasks.some(t => t._id === selectedTask._id))._id;
      
      const messageData = {
        userId: currentUser.id,
        userName: currentUser.name,
        text: messageText,
        timestamp: new Date().toISOString()
      };

      const response = await api.addMessage(projectId, selectedTask._id, messageData);
      setProjects(projects.map(p => p._id === projectId ? response.data : p));
      
      const updatedProject = response.data;
      const updatedTask = updatedProject.tasks.find(t => t._id === selectedTask._id);
      setSelectedTask(updatedTask);
      
      setMessageText('');
    } catch (err) {
      alert('Failed to send message: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleFileUpload = async (e, projectId, taskId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileData = {
        files: [{
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedBy: currentUser.id,
          uploadedByName: currentUser.name,
          timestamp: new Date().toISOString()
        }]
      };

      const response = await api.addFiles(projectId, taskId, fileData);
      setProjects(projects.map(p => p._id === projectId ? response.data : p));
      e.target.value = '';
    } catch (err) {
      alert('Failed to upload file: ' + (err.response?.data?.error || err.message));
    }
  };

  const isTaskAccessibleForEmployee = (task, employeeId) => {
    const projectsToUse = currentUser.role === 'admin' ? allEmployeeProjects : projects;
    const employeeTasks = projectsToUse
      .flatMap(p => p.tasks)
      .filter(t => t.assignedTo.some(assigned => (assigned._id || assigned) === employeeId))
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const taskIndex = employeeTasks.findIndex(t => t._id === task._id);
    
    if (taskIndex === 0) return true;
    
    for (let i = 0; i < taskIndex; i++) {
      if (employeeTasks[i].status !== 'completed') {
        return false;
      }
    }
    
    return true;
  };

  const getBlockingTask = (task, employeeId) => {
    const projectsToUse = currentUser.role === 'admin' ? allEmployeeProjects : projects;
    const employeeTasks = projectsToUse
      .flatMap(p => p.tasks)
      .filter(t => t.assignedTo.some(assigned => (assigned._id || assigned) === employeeId))
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const taskIndex = employeeTasks.findIndex(t => t._id === task._id);
    
    if (taskIndex === 0) return null;
    
    for (let i = taskIndex - 1; i >= 0; i--) {
      if (employeeTasks[i].status !== 'completed') {
        return employeeTasks[i];
      }
    }
    
    return null;
  };

  const openProjectModal = (project = null) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({ name: project.name, description: project.description });
    } else {
      setEditingProject(null);
      setProjectForm({ name: '', description: '' });
    }
    setShowProjectModal(true);
  };

  const openTaskModal = (projectId, task = null) => {
    setSelectedProjectId(projectId);
    if (task) {
      setEditingTask(task);
      const dueDateStr = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
      const assignedIds = task.assignedTo.map(assigned => (assigned._id || assigned).toString());
      setTaskForm({ 
        title: task.title, 
        assignedTo: assignedIds,
        sequenceOrder: task.sequenceOrder.toString(),
        dueDate: dueDateStr
      });
    } else {
      setEditingTask(null);
      setTaskForm({ title: '', assignedTo: [], sequenceOrder: '', dueDate: '' });
    }
    setShowTaskModal(true);
  };

  const openChatModal = (task) => {
    const updatedTask = projects
      .flatMap(p => p.tasks)
      .find(t => t._id === task._id);
    setSelectedTask(updatedTask);
    setShowChatModal(true);
  };

  const openStatusModal = (task) => {
    setTaskToUpdateStatus(task);
    setShowStatusModal(true);
  };

  const openPerformanceModal = (employeeId) => {
    setSelectedEmployee(employeeId);
    setShowPerformanceModal(true);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const toggleAssignee = (userId) => {
    const currentAssignees = taskForm.assignedTo;
    if (currentAssignees.includes(userId)) {
      setTaskForm({...taskForm, assignedTo: currentAssignees.filter(id => id !== userId)});
    } else {
      setTaskForm({...taskForm, assignedTo: [...currentAssignees, userId]});
    }
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Overdue', color: 'text-red-600', bgColor: 'bg-red-50 border-red-300' };
    if (diffDays === 0) return { text: 'Due Today', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-300' };
    if (diffDays === 1) return { text: 'Due Tomorrow', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-300' };
    return { text: `Due in ${diffDays} days`, color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-300' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  const myTasks = currentUser.role === 'employee' 
    ? projects.flatMap(p => p.tasks
        .filter(t => t.assignedTo.some(assigned => (assigned._id || assigned) === currentUser.id))
        .map(t => ({...t, projectName: p.name, projectId: p._id})))
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    : [];

  const myStats = currentUser.role === 'employee' ? getEmployeeStats(currentUser.id) : null;
  const weeklyData = currentUser.role === 'employee' ? getWeeklyData(currentUser.id) : [];
  const monthlyData = currentUser.role === 'employee' ? getMonthlyData(currentUser.id) : [];
  const reminders = currentUser.role === 'employee' ? getUpcomingReminders(currentUser.id) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-md border-b-2 border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Task Manager</h1>
              <p className="text-sm text-gray-600">{currentUser.role === 'admin' ? 'Admin Dashboard' : 'Employee Dashboard'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-gray-800">{currentUser.name}</p>
              <p className="text-sm text-gray-500 capitalize">{currentUser.role}</p>
            </div>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${currentUser.color} flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
              {currentUser.initials}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Reminders for Employee */}
        {currentUser.role === 'employee' && reminders.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400 rounded-2xl p-5 mb-6 shadow-lg animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="w-7 h-7 text-orange-600" />
              <h3 className="text-xl font-bold text-orange-800">Task Reminders - Due Soon!</h3>
            </div>
            <div className="space-y-3">
              {reminders.map(task => (
                <div key={task._id} className="bg-white rounded-xl p-4 border-2 border-orange-300 shadow-md">
                  <p className="font-bold text-gray-800 text-lg">{task.title}</p>
                  <p className="text-sm text-gray-600 mt-1">Project: {task.projectName}</p>
                  <p className="text-sm font-bold text-orange-700 mt-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Due: {new Date(task.dueDate).toLocaleDateString()} at {new Date(task.dueDate).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Employee Performance Section */}
        {currentUser.role === 'employee' && myStats && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-indigo-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                My Performance
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
                <p className="text-sm font-semibold text-blue-600 mb-1">Total Tasks</p>
                <p className="text-3xl font-bold text-blue-700">{myStats.total}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
                <p className="text-sm font-semibold text-green-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-700">{myStats.completed}</p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border-2 border-yellow-200">
                <p className="text-sm font-semibold text-yellow-600 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-yellow-700">{myStats.inProgress}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
                <p className="text-sm font-semibold text-purple-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> This Week
                </p>
                <p className="text-3xl font-bold text-purple-700">{myStats.weekCompleted}</p>
              </div>
              
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border-2 border-pink-200">
                <p className="text-sm font-semibold text-pink-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> This Month
                </p>
                <p className="text-3xl font-bold text-pink-700">{myStats.monthCompleted}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border-2 border-purple-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Performance (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="day" stroke="#6366f1" />
                    <YAxis stroke="#6366f1" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#f8f9ff', borderRadius: '8px', border: '2px solid #6366f1' }}
                    />
                    <Bar dataKey="tasks" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-xl p-5 border-2 border-pink-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Performance (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="week" stroke="#ec4899" />
                    <YAxis stroke="#ec4899" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff5f7', borderRadius: '8px', border: '2px solid #ec4899' }}
                    />
                    <Line type="monotone" dataKey="tasks" stroke="#ec4899" strokeWidth={3} dot={{ r: 5, fill: '#ec4899' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Admin Team Workload Section */}
        {currentUser.role === 'admin' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-indigo-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                Team Workload Overview
              </h2>
              <button
                onClick={() => setShowWorkloadModal(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
              >
                <Workflow className="w-5 h-5" />
                Manage Workload
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.filter(u => u.role === 'employee').map(employee => {
                const stats = getEmployeeStats(employee._id);
                const workload = calculateWorkloadScore(employee._id);
                return (
                  <div 
                    key={employee._id} 
                    className="bg-gradient-to-br from-white to-indigo-50 rounded-xl p-5 border-2 border-indigo-200 hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1"
                    onClick={() => openPerformanceModal(employee._id)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${employee.color} flex items-center justify-center text-lg font-bold text-white shadow-md`}>
                        {employee.initials}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{employee.name}</h3>
                        <p className="text-xs text-gray-500">{stats.total} tasks</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getWorkloadBadgeColor(workload.score)}`}>
                        {getWorkloadLevel(workload.score)} Workload
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 font-semibold">Completed</span>
                        <span className="font-bold text-green-700">{stats.completed}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600 font-semibold">In Progress</span>
                        <span className="font-bold text-blue-700">{stats.inProgress}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-semibold">Pending</span>
                        <span className="font-bold text-gray-700">{stats.pending}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                        <span className="text-purple-600 font-semibold">Workload Score</span>
                        <span className="font-bold text-purple-700">{workload.score}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Employee Tasks Section */}
        {currentUser.role === 'employee' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-indigo-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">My Assigned Tasks</h2>
            <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-200">
              Complete tasks in order. Next task unlocks after completing the previous one.
            </p>
            {myTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No tasks assigned yet</p>
            ) : (
              <div className="space-y-4">
                {myTasks.map((task, index) => {
                  const isAccessible = isTaskAccessibleForEmployee(task, currentUser.id);
                  const blockingTask = getBlockingTask(task, currentUser.id);
                  const isTeamTask = task.assignedTo.length > 1;
                  const teamMembers = task.assignedTo.map(assignedId => {
                    const id = assignedId._id || assignedId;
                    return users.find(u => u._id === id);
                  }).filter(Boolean);
                  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;
                  
                  return (
                    <div key={task._id} className={`rounded-xl p-5 transition-all border-2 ${isAccessible ? 'border-indigo-200 hover:border-indigo-400 bg-gradient-to-r from-white to-indigo-50 hover:shadow-lg' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow">
                              Task #{index + 1}
                            </span>
                            <p className="font-bold text-gray-800 text-lg">{task.title}</p>
                            {!isAccessible && <Lock className="w-5 h-5 text-orange-500" />}
                            {isTeamTask && (
                              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Team Task
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-semibold">Project:</span> {task.projectName}
                          </p>

                          {dueDateInfo && (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${dueDateInfo.bgColor} mb-3`}>
                              <Calendar className={`w-4 h-4 ${dueDateInfo.color}`} />
                              <span className={`text-sm font-bold ${dueDateInfo.color}`}>
                                {dueDateInfo.text} - {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          
                          {isTeamTask && (
                            <div className="flex items-center gap-2 mb-3">
                              <p className="text-sm font-semibold text-gray-700">Team Members:</p>
                              <div className="flex -space-x-2">
                                {teamMembers.map(member => (
                                  <div 
                                    key={member._id}
                                    className={`w-8 h-8 rounded-full bg-gradient-to-r ${member.color} flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-md hover:scale-110 transition-transform cursor-pointer`}
                                    title={member.name}
                                  >
                                    {member.initials}
                                  </div>
                                ))}
                              </div>
                              <span className="text-xs text-gray-600 ml-2">
                                {teamMembers.map(m => m.name).join(', ')}
                              </span>
                            </div>
                          )}
                          
                          {!isAccessible && blockingTask && (
                            <div className="mt-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg">
                              <p className="text-sm text-orange-800 flex items-center gap-2 font-semibold">
                                <Lock className="w-4 h-4" />
                                Locked: Complete {blockingTask.title} first
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${getStatusColor(task.status)}`}>
                            {task.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {isAccessible && (
                        <div className="flex gap-2 flex-wrap mb-3">
                          <button
                            onClick={() => openStatusModal(task)}
                            className="text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-semibold"
                          >
                            Update Status
                          </button>
                          
                          <label className="text-sm bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 font-semibold">
                            <Upload className="w-4 h-4" />
                            Upload File
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, task.projectId, task._id)}
                            />
                          </label>
                          
                          {isTeamTask && (
                            <button
                              onClick={() => openChatModal(task)}
                              className="text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Team Chat ({task.messages.length})
                            </button>
                          )}
                        </div>
                      )}

                      {task.files.length > 0 && (
                        <div className="mt-4 pt-4 border-t-2 border-indigo-100">
                          <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Attached Files:
                          </p>
                          <div className="space-y-2">
                            {task.files.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                <FileText className="w-4 h-4 text-indigo-600" />
                                <span className="font-semibold">{file.name}</span>
                                <span className="text-gray-500 text-xs">by {file.uploadedByName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Admin Projects Section */}
        {currentUser.role === 'admin' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Projects</h2>
              <button
                onClick={() => openProjectModal()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-indigo-100">
                <p className="text-gray-500 text-lg">No projects yet. Create your first project!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {projects.map(project => (
                  <div key={project._id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-indigo-100">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold">{project.name}</h3>
                        <p className="text-indigo-100 mt-2">{project.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openProjectModal(project)}
                          className="p-3 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project._id)}
                          className="p-3 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold text-gray-800 text-lg">Tasks ({project.tasks.length})</h4>
                        <button
                          onClick={() => openTaskModal(project._id)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-bold flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          Add Task
                        </button>
                      </div>

                      {project.tasks.length === 0 ? (
                        <p className="text-gray-400 text-center py-12">No tasks yet</p>
                      ) : (
                        <div className="space-y-3">
                          {project.tasks.sort((a, b) => a.sequenceOrder - b.sequenceOrder).map(task => {
                            const assignedUsers = task.assignedTo.map(assignedId => {
                              const id = assignedId._id || assignedId;
                              return users.find(u => u._id === id);
                            }).filter(Boolean);
                            const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;
                            
                            return (
                              <div key={task._id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-all bg-gradient-to-r from-white to-gray-50">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                      <span className="bg-gray-700 text-white text-xs px-3 py-1 rounded-full font-bold">Seq #{task.sequenceOrder}</span>
                                      <p className="font-bold text-gray-800 text-lg">{task.title}</p>
                                      {task.assignedTo.length > 1 && (
                                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                                          <Users className="w-3 h-3" />
                                          Team
                                        </span>
                                      )}
                                    </div>

                                    {dueDateInfo && (
                                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${dueDateInfo.bgColor} mb-2`}>
                                        <Calendar className={`w-3 h-3 ${dueDateInfo.color}`} />
                                        <span className={`text-xs font-bold ${dueDateInfo.color}`}>
                                          {dueDateInfo.text} - {new Date(task.dueDate).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center gap-2 mb-2">
                                      <p className="text-sm text-gray-600 font-semibold">Assigned to:</p>
                                      <div className="flex -space-x-2">
                                        {assignedUsers.map(user => (
                                          <div 
                                            key={user._id}
                                            className={`w-7 h-7 rounded-full bg-gradient-to-r ${user.color} flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-md`}
                                            title={user.name}
                                          >
                                            {user.initials}
                                          </div>
                                        ))}
                                      </div>
                                      <span className="text-sm text-gray-700 ml-2">
                                        {assignedUsers.map(u => u?.name).join(', ')}
                                      </span>
                                    </div>
                                    
                                    {task.files.length > 0 && (
                                      <p className="text-xs text-gray-600 font-semibold mt-2 flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {task.files.length} file(s) attached
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(task.status)}
                                      <span className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${getStatusColor(task.status)}`}>
                                        {task.status.replace('-', ' ').toUpperCase()}
                                      </span>
                                    </div>
                                    {task.assignedTo.length > 1 && (
                                      <button
                                        onClick={() => openChatModal(task)}
                                        className="p-2 hover:bg-purple-100 rounded-lg transition-all"
                                        title="View team chat"
                                      >
                                        <MessageCircle className="w-5 h-5 text-purple-600" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openReassignmentModal(task)}
                                      className="p-2 hover:bg-green-100 rounded-lg transition-all"
                                      title="Reassign task"
                                    >
                                      <TrendingUp className="w-5 h-5 text-green-600" />
                                    </button>
                                    <button
                                      onClick={() => openTaskModal(project._id, task)}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                                    >
                                      <Edit2 className="w-5 h-5 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTask(project._id, task._id)}
                                      className="p-2 hover:bg-red-100 rounded-lg transition-all"
                                    >
                                      <Trash2 className="w-5 h-5 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {editingProject ? 'Edit Project' : 'Add New Project'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Project Name</label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Enter project description"
                  rows="3"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                    setProjectForm({ name: '', description: '' });
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={editingProject ? handleEditProject : handleAddProject}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  {editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Task Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Assign To (Select multiple)</label>
                <div className="space-y-2 border-2 border-gray-300 rounded-xl p-4 max-h-40 overflow-y-auto">
                  {users.filter(u => u.role === 'employee').map(emp => (
                    <label key={emp._id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-all">
                      <input
                        type="checkbox"
                        checked={taskForm.assignedTo.includes(emp._id.toString())}
                        onChange={() => toggleAssignee(emp._id.toString())}
                        className="w-5 h-5 text-indigo-600"
                      />
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${emp.color} flex items-center justify-center text-xs font-bold text-white`}>
                        {emp.initials}
                      </div>
                      <span className="text-sm font-semibold">{emp.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 bg-blue-50 p-2 rounded">Tasks are unlocked sequentially per employee</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Sequence Order (Per Employee)</label>
                <input
                  type="number"
                  min="1"
                  value={taskForm.sequenceOrder}
                  onChange={(e) => setTaskForm({...taskForm, sequenceOrder: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Enter sequence number"
                />
                <p className="text-xs text-gray-500 mt-2 bg-yellow-50 p-2 rounded">Employee must complete lower sequence tasks first</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-2 bg-orange-50 p-2 rounded">Employees will be reminded 1 day before the due date</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                    setTaskForm({ title: '', assignedTo: [], sequenceOrder: '', dueDate: '' });
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTask ? handleEditTask : handleAddTask}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  {editingTask ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && taskToUpdateStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Update Task Status</h3>
            <p className="text-gray-600 mb-6">Task: <strong>{taskToUpdateStatus.title}</strong></p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleUpdateTaskStatus(taskToUpdateStatus.projectId, taskToUpdateStatus._id, 'pending')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  taskToUpdateStatus.status === 'pending' 
                    ? 'border-gray-400 bg-gray-50 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-gray-500" />
                  <div className="text-left">
                    <p className="font-bold text-gray-800">Pending</p>
                    <p className="text-xs text-gray-500">Task not started yet</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleUpdateTaskStatus(taskToUpdateStatus.projectId, taskToUpdateStatus._id, 'in-progress')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  taskToUpdateStatus.status === 'in-progress' 
                    ? 'border-blue-400 bg-blue-50 shadow-lg' 
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-blue-500" />
                  <div className="text-left">
                    <p className="font-bold text-gray-800">In Progress</p>
                    <p className="text-xs text-gray-500">Currently working on this</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleUpdateTaskStatus(taskToUpdateStatus.projectId, taskToUpdateStatus._id, 'completed')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  taskToUpdateStatus.status === 'completed' 
                    ? 'border-green-400 bg-green-50 shadow-lg' 
                    : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <div className="text-left">
                    <p className="font-bold text-gray-800">Completed</p>
                    <p className="text-xs text-gray-500">Task is finished</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                setShowStatusModal(false);
                setTaskToUpdateStatus(null);
              }}
              className="w-full mt-4 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl">
              <h3 className="text-2xl font-bold">Team Discussion</h3>
              <p className="text-sm text-purple-100 mt-2">{selectedTask.title}</p>
              
              <div className="flex items-center gap-3 mt-4">
                <p className="text-sm font-semibold">Team Members:</p>
                <div className="flex -space-x-2">
                  {selectedTask.assignedTo.map(assignedId => {
                    const id = assignedId._id || assignedId;
                    const member = users.find(u => u._id === id);
                    if (!member) return null;
                    return (
                      <div 
                        key={id}
                        className={`w-9 h-9 rounded-full bg-gradient-to-r ${member.color} flex items-center justify-center text-sm font-bold text-white border-3 border-white shadow-lg hover:scale-110 transition-transform`}
                        title={member.name}
                      >
                        {member.initials}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {selectedTask.messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-400 font-semibold">No messages yet. Start the discussion!</p>
                </div>
              ) : (
                selectedTask.messages.map((msg, idx) => {
                  const sender = users.find(u => u._id === msg.userId);
                  if (!sender) return null;
                  return (
                    <div
                      key={idx}
                      className={`flex ${msg.userId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2 max-w-[70%] ${msg.userId === currentUser.id ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${sender.color} flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0`}>
                          {sender.initials}
                        </div>
                        <div
                          className={`rounded-2xl p-4 shadow-md ${
                            msg.userId === currentUser.id
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                              : 'bg-white text-gray-800 border-2 border-gray-200'
                          }`}
                        >
                          <p className="text-xs font-bold mb-1 opacity-75">{msg.userName}</p>
                          <p className="text-sm">{msg.text}</p>
                          <p className="text-xs mt-2 opacity-75">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t-2 p-4 bg-gray-50">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Type your message..."
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
              <button
                onClick={() => {
                  setShowChatModal(false);
                  setSelectedTask(null);
                  setMessageText('');
                }}
                className="mt-3 w-full px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-100 transition-all font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance Modal */}
      {showPerformanceModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            {(() => {
              const employee = users.find(u => u._id === selectedEmployee);
              if (!employee) return null;
              const stats = getEmployeeStats(selectedEmployee);
              const employeeTasks = projects.flatMap(p => 
                p.tasks.filter(t => t.assignedTo.some(assigned => (assigned._id || assigned) === selectedEmployee))
                  .map(t => ({...t, projectName: p.name}))
              );
              const empWeeklyData = getWeeklyData(selectedEmployee);
              const empMonthlyData = getMonthlyData(selectedEmployee);
              
              return (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${employee.color} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}>
                      {employee.initials}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">{employee.name}</h3>
                      <p className="text-gray-600">Performance Overview</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
                      <p className="text-xs font-bold text-blue-600 mb-1">Total</p>
                      <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
                      <p className="text-xs font-bold text-green-600 mb-1">Completed</p>
                      <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border-2 border-yellow-200">
                      <p className="text-xs font-bold text-yellow-600 mb-1">In Progress</p>
                      <p className="text-2xl font-bold text-yellow-700">{stats.inProgress}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
                      <p className="text-xs font-bold text-purple-600 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Week
                      </p>
                      <p className="text-2xl font-bold text-purple-700">{stats.weekCompleted}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border-2 border-pink-200">
                      <p className="text-xs font-bold text-pink-600 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Month
                      </p>
                      <p className="text-2xl font-bold text-pink-700">{stats.monthCompleted}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border-2 border-purple-200">
                      <h4 className="text-lg font-bold text-gray-800 mb-4">Weekly Performance</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={empWeeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="day" stroke="#6366f1" />
                          <YAxis stroke="#6366f1" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#f8f9ff', borderRadius: '8px', border: '2px solid #6366f1' }}
                          />
                          <Bar dataKey="tasks" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-xl p-5 border-2 border-pink-200">
                      <h4 className="text-lg font-bold text-gray-800 mb-4">Monthly Performance</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={empMonthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="week" stroke="#ec4899" />
                          <YAxis stroke="#ec4899" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff5f7', borderRadius: '8px', border: '2px solid #ec4899' }}
                          />
                          <Line type="monotone" dataKey="tasks" stroke="#ec4899" strokeWidth={3} dot={{ r: 5, fill: '#ec4899' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <h4 className="font-bold text-gray-800 mb-4">All Tasks</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {employeeTasks.map(task => (
                      <div key={task._id} className="border-2 border-gray-200 rounded-xl p-3 bg-gradient-to-r from-white to-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{task.title}</p>
                            <p className="text-xs text-gray-600">Project: {task.projectName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(task.status)}`}>
                              {task.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setShowPerformanceModal(false);
                      setSelectedEmployee(null);
                    }}
                    className="mt-6 w-full px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                  >
                    Close
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Workload Management Modal */}
      {showWorkloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Workflow className="w-6 h-6 text-indigo-600" />
                Workload Management
              </h3>
              <button
                onClick={() => setShowWorkloadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
              <h4 className="font-bold text-indigo-800 mb-2">Workload Scoring System</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-semibold">High Workload:</span>
                  <span>Score &gt; 15</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="font-semibold">Medium Workload:</span>
                  <span>Score 8-15</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-semibold">Low Workload:</span>
                  <span>Score &lt; 8</span>
                </div>
              </div>
              <p className="text-xs text-indigo-600 mt-2">
                Scoring: Pending (3 pts) • In Progress (2 pts) • Completed (0.5 pts)
              </p>
            </div>

            <div className="space-y-4">
              {users.filter(u => u.role === 'employee').map(employee => {
                const workload = calculateWorkloadScore(employee._id);
                const stats = getEmployeeStats(employee._id);
                
                return (
                  <div key={employee._id} className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-r from-white to-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${employee.color} flex items-center justify-center text-sm font-bold text-white shadow-md`}>
                          {employee.initials}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{employee.name}</h4>
                          <p className="text-xs text-gray-600">{stats.total} total tasks</p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getWorkloadBadgeColor(workload.score)}`}>
                        {getWorkloadLevel(workload.score)} Workload ({workload.score})
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{workload.completed}</p>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{workload.inProgress}</p>
                        <p className="text-xs text-gray-600">In Progress</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-600">{workload.pending}</p>
                        <p className="text-xs text-gray-600">Pending</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{workload.score}</p>
                        <p className="text-xs text-gray-600">Workload Score</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowWorkloadModal(false)}
              className="mt-6 w-full px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Task Reassignment Modal */}
      {taskToReassign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Reassign Task</h3>
            <p className="text-gray-600 mb-6">
              Task: <strong>{taskToReassign.title}</strong>
              <br />
              <span className="text-sm text-gray-500">
                Current assignees: {taskToReassign.assignedTo.map(assigned => {
                  const user = users.find(u => u._id === (assigned._id || assigned));
                  return user?.name;
                }).filter(Boolean).join(', ')}
              </span>
            </p>

            <div className="mb-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border-2 border-green-200">
              <h4 className="font-bold text-green-800 mb-2">💡 Smart Reassignment Suggestions</h4>
              <p className="text-sm text-green-700">
                Employees are sorted by workload score (lowest first). Consider reassigning to team members with lighter workloads for better balance.
              </p>
            </div>

            <div className="space-y-4">
              {reassignmentSuggestions.map((suggestion, index) => (
                <div key={suggestion.employee._id} className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-r from-white to-gray-50 hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${suggestion.employee.color} flex items-center justify-center text-sm font-bold text-white shadow-md`}>
                        {suggestion.employee.initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{suggestion.employee.name}</h4>
                        <p className="text-xs text-gray-600">
                          {suggestion.workload.total} tasks • Score: {suggestion.workload.score}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getWorkloadBadgeColor(suggestion.workload.score)}`}>
                      {getWorkloadLevel(suggestion.workload.score)} Workload
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-green-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-green-700">{suggestion.workload.completed}</p>
                      <p className="text-xs text-green-600">Done</p>
                    </div>
                    <div className="text-center bg-blue-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-blue-700">{suggestion.workload.inProgress}</p>
                      <p className="text-xs text-blue-600">In Progress</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-700">{suggestion.workload.pending}</p>
                      <p className="text-xs text-gray-600">Pending</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const projectId = projects.find(p => p.tasks.some(t => t._id === taskToReassign._id))._id;
                      handleReassignTask(projectId, taskToReassign._id, suggestion.employee._id);
                    }}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-2 rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Assign Here (Recommended {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'})
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setTaskToReassign(null);
                setReassignmentSuggestions([]);
              }}
              className="mt-6 w-full px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagerApp;