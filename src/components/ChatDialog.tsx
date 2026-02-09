import { useState, useEffect, useRef } from "react";
import { X, Send, Camera, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chatService, type ChatMessage } from "@/services/chatService";
import { photoService } from "@/services/photoService";
import { authService } from "@/services/authService";

// Use the interface from service to ensure consistency
interface Message extends ChatMessage {}

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserRole: "consumer" | "transporter";
  otherUserAvatar?: string;
}

export function ChatDialog({
  isOpen,
  onClose,
  bookingId,
  otherUserId,
  otherUserName,
  otherUserRole,
}: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && bookingId) {
      loadCurrentUser();
      loadMessages();
      const interval = setInterval(loadMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadCurrentUser = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadMessages = async () => {
    try {
      const msgs = await chatService.getMessages(bookingId);
      setMessages(msgs);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await chatService.sendMessage(bookingId, currentUserId, newMessage);
      setNewMessage("");
      await loadMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await photoService.uploadPhoto(file, bookingId, currentUserId);
      if (result) {
        await chatService.sendPhoto(bookingId, currentUserId, result.url);
        await loadMessages();
      }
    } catch (error) {
      console.error("Failed to upload photo:", error);
      alert(error instanceof Error ? error.message : "Failed to upload photo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 bg-card">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b space-y-2">
          <DialogTitle className="text-xl font-display font-semibold flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {otherUserName?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">{otherUserName || "User"}</div>
              <div className="text-xs text-muted-foreground font-normal capitalize">{otherUserRole}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/30">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex h-16 w-16 rounded-full bg-muted items-center justify-center mb-4">
                <Send className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start the conversation</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-soft ${
                      isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border"
                    }`}
                  >
                    {message.messageType === "photo" && message.photoUrl && (
                      <a
                        href={message.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mb-2"
                      >
                        <img
                          src={message.photoUrl}
                          alt="Uploaded"
                          className="max-w-full h-auto rounded-lg hover:opacity-90 transition-opacity"
                          style={{ maxHeight: "300px" }}
                        />
                      </a>
                    )}
                    {message.content && (
                      <p className="text-sm leading-relaxed break-words">{message.content}</p>
                    )}
                    <div className={`text-xs mt-2 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 pt-4 border-t bg-background">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="shrink-0 hover:bg-accent/10"
            >
              {isUploading ? (
                <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-accent" />
              )}
            </Button>

            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading || isUploading}
              className="flex-1 border-muted focus:ring-primary"
            />

            <Button 
              type="submit" 
              size="icon"
              disabled={!newMessage.trim() || isLoading || isUploading}
              className="shrink-0 shadow-soft"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}