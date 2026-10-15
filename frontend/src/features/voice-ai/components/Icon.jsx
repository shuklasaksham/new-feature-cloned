import React from "react";
import {
  ArrowLeft, ArrowRight, ArrowUp, AudioLines, Bell, Calendar, Check, ChevronDown, ChevronRight, CircleCheck,
  CircleDot, Clock, Download, Ellipsis, Eye, FileText, GitBranch, GripVertical, Hand, Info, Keyboard, Languages,
  Layers, LayoutGrid, ListChecks, LoaderCircle, Lock, Mail, MessageCircleQuestion, MessagesSquare, Mic, MicOff,
  Pause, Pencil, Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Play, Plus, RefreshCw, Reply, Search, Send,
  Settings, ShieldCheck, Sparkles, StickyNote, Trash2, TriangleAlert, Volume2, X, History,
} from "lucide-react";

const ICONS = {
  "arrow-left": ArrowLeft, "arrow-right": ArrowRight, "arrow-up": ArrowUp, "audio-lines": AudioLines, bell: Bell,
  calendar: Calendar, check: Check, "chevron-down": ChevronDown, "chevron-right": ChevronRight, "check-circle": CircleCheck,
  record: CircleDot, clock: Clock, download: Download, more: Ellipsis, eye: Eye, file: FileText, "git-branch": GitBranch,
  grip: GripVertical, hand: Hand, info: Info, keyboard: Keyboard, languages: Languages, layers: Layers, grid: LayoutGrid,
  "list-checks": ListChecks, loader: LoaderCircle, lock: Lock, mail: Mail, ask: MessageCircleQuestion,
  messages: MessagesSquare, mic: Mic, "mic-off": MicOff, pause: Pause, pencil: Pencil, phone: Phone,
  "phone-incoming": PhoneIncoming, "phone-missed": PhoneMissed, "phone-off": PhoneOff, "phone-outgoing": PhoneOutgoing,
  play: Play, plus: Plus, refresh: RefreshCw, reply: Reply, search: Search, send: Send, settings: Settings, "shield-check": ShieldCheck,
  sparkles: Sparkles, note: StickyNote, trash: Trash2, alert: TriangleAlert, volume: Volume2, x: X, history: History,
};

// Lucide at 16px with a 1.5 stroke — same as the Figma icon set.
export default function Icon({ name, size = 16, className = "", spin = false, ...rest }) {
  const Cmp = ICONS[name] || Info;
  return <Cmp size={size} strokeWidth={1.5} className={`${className}${spin ? " spin" : ""}`} aria-hidden="true" {...rest} />;
}
