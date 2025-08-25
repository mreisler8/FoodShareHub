import logo from "../../assets/logo.png";

interface PizzaLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PizzaLogo({ size = "md", className = "" }: PizzaLogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  };

  return (
    <img 
      src={logo} 
      alt="Circles Logo" 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}