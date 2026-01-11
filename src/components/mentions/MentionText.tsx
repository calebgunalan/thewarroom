import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MentionTextProps {
  content: string;
  className?: string;
}

const MentionText = ({ content, className }: MentionTextProps) => {
  // Parse content and render mentions as links
  const parts = content.split(/(@\w+)/g);

  return (
    <p className={cn("whitespace-pre-wrap", className)}>
      {parts.map((part, index) => {
        if (part.startsWith("@")) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              to={`/members?search=${username}`}
              className="text-accent hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
};

export default MentionText;
