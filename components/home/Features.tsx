import { Truck, Headphones, Shield, Tag } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: <Truck className="w-6 h-6 text-white" />,
      title: "Return & refund",
      description: "Money back guarantee",
      bgColor: "bg-[#ffa500]",
      cardBg: "bg-[#fff2da]"
    },
    {
      icon: <Headphones className="w-6 h-6 text-white" />,
      title: "Quality Support",
      description: "Always online 24/7",
      bgColor: "bg-[#00b8db]",
      cardBg: "bg-[#DCF6FB]"
    },
    {
      icon: <Shield className="w-6 h-6 text-white" />,
      title: "Secure Payment",
      description: "30% off by subscribing",
      bgColor: "bg-[#00c951]",
      cardBg: "bg-[#eaf9e8]"
    },
    {
      icon: <Tag className="w-6 h-6 text-white" />,
      title: "Daily Offers",
      description: "20% off by subscribing",
      bgColor: "bg-[#00bba7]",
      cardBg: "bg-[#d9f5f3]"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pl-6 py-8">
      {features.map((feature, index) => (
        <div
          key={index}
          className={`${feature.cardBg} rounded-xl relative overflow-visible flex items-center py-8 pr-6`}
        >
          <div className={`${feature.bgColor} p-4 rounded-xl flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2`}>
            {feature.icon}
          </div>
          <div className="pl-12">
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
              {feature.title}
            </h3>
            <p className="text-gray-500 text-sm font-normal">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
