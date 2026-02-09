import { useState, useEffect, useRef } from "react";
import { X, Send, Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { chatService, type ChatMessage } from "@/services/chatService";
import { photoService } from "@/services/photoService";
import { useToast } from "@/hooks/use-toast";

interface ChatDialogProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  userId: string;
  otherUserName: string;
  otherUserAvatar?: string;
}

export function ChatDialog({
  open,
  onClose,
  bookingId,
  userId,
  otherUserName,
  otherUserAvatar,
}: ChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && bookingId) {
      loadMessages();
      const unsubscribe = chatService.subscribeToMessages(bookingId, (message) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      return () => {
        unsubscribe();
      };
    }
  }, [open, bookingId]);

  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
      scrollToBottom();
    }
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const msgs = await chatService.getMessages(bookingId);
    setMessages(msgs);
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    await chatService.markAllAsRead(bookingId, userId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const message = await chatService.sendMessage(bookingId, userId, newMessage.trim());
    
    if (message) {
      setNewMessage("");
    } else {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
    setSending(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await photoService.compressImage(file);
      const result = await photoService.uploadPhoto(compressed, bookingId, userId);

      if (result) {
        const message = await chatService.sendPhoto(
          bookingId,
          userId,
          result.url,
          "Photo"
        );

        if (!message) {
          toast({
            title: "Error",
            description: "Failed to send photo. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to upload photo. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={otherUserAvatar} />
                <AvatarFallback>{getInitials(otherUserName)}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{otherUserName}</DialogTitle>
                <p className="text-sm text-gray-500">Chat</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No messages yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Start the conversation
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === userId;
              const isSystem = message.messageType === "system";

              if (isSystem) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="bg-gray-100 text-gray-600 text-xs px-4 py-2 rounded-full">
                      {message.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 max-w-[80%] ${isOwn ? "flex-row-reverse" : ""}`}>
                    {!isOwn && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.senderAvatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(message.senderName || "U")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      {message.messageType === "photo" && message.photoUrl ? (
                        <div className={`rounded-lg overflow-hidden ${isOwn ? "bg-blue-500" : "bg-gray-100"}`}>
                          <img
                            src={message.photoUrl}
                            alt="Shared photo"
                            className="max-w-full h-auto"
                          />
                          {message.content !== "Photo" && (
                            <p className={`px-3 py-2 text-sm ${isOwn ? "text-white" : "text-gray-700"}`}>
                              {message.content}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`px-4 py-2 rounded-lg ${
                            isOwn
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm break-words">{message.content}</p>
                        </div>
                      )}
                      <p className={`text-xs text-gray-400 mt-1 ${isOwn ? "text-right" : ""}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t px-6 py-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </Button>

            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending || uploading}
            />

            <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}