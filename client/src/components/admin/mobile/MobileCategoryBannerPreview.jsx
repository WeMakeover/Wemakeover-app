/* eslint-disable react/prop-types */
export default function MobileCategoryBannerPreview({
  name = "Category Name",
  imagePreview = null,
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-[#D5C0A5]">
      <div className="relative h-40">
        {imagePreview ? (
          <img src={imagePreview} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#E8D8C8] to-[#C9B29A]" />
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-[60px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(245,245,245,0.18) 22%, rgba(210,210,210,0.26) 50%, rgba(175,175,175,0.34) 78%, rgba(145,145,145,0.38) 100%)",
          }}
        />
        <p className="absolute left-5 bottom-3 text-white text-xl font-extrabold drop-shadow">
          {name || "Category Name"}
        </p>
      </div>
    </div>
  );
}
