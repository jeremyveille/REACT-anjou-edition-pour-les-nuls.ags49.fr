import React from 'react';
import {
  // Widget icons
  Layout,
  Layers,
  Square,
  Columns,
  LayoutGrid,
  ArrowUpDown,
  Minus,
  Type,
  Image,
  MousePointer,
  Video,
  Smile,
  CreditCard,
  AlertTriangle,
  Quote,
  Megaphone,
  HelpCircle,
  // Icon block choices
  Heart,
  Star,
  Coffee,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ThumbsUp,
  User,
  Award,
  Bookmark,
  Globe,
  Zap,
  Shield,
  Gift,
  Home,
  Settings,
  Search,
  Download,
  Upload,
  Share2,
  Lock,
  Unlock,
  Camera,
  Music
} from 'lucide-react';

export const ICON_MAP = {
  // Widgets
  Layout,
  Layers,
  Square,
  Columns,
  LayoutGrid,
  ArrowUpDown,
  Minus,
  Type,
  Image,
  MousePointer,
  Video,
  Smile,
  CreditCard,
  AlertTriangle,
  Quote,
  Megaphone,
  HelpCircle,
  // Icon selector items
  Heart,
  Star,
  Coffee,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ThumbsUp,
  User,
  Award,
  Bookmark,
  Globe,
  Zap,
  Shield,
  Gift,
  Home,
  Settings,
  Search,
  Download,
  Upload,
  Share2,
  Lock,
  Unlock,
  Camera,
  Music
};

export function getWidgetIcon(iconName, defaultIcon = HelpCircle) {
  if (!iconName) return defaultIcon;
  return ICON_MAP[iconName] || defaultIcon;
}

export function renderWidgetIcon(iconName, props = {}) {
  const Component = getWidgetIcon(iconName);
  return React.createElement(Component, props);
}
